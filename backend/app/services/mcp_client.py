"""
MCP Client — connects to MCP servers over streamable-http transport.

Handles session initialization, tool discovery, and tool execution.
Used by the treatment copilot to call Medical and Pharmacy MCP tools.

Both servers return SSE format (event: message\ndata: {...}) so we
parse the data lines to extract JSON-RPC responses.
"""

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


def _parse_sse_json(text: str) -> dict:
    """Parse JSON from an SSE response body.

    SSE format:
        event: message
        data: {"jsonrpc": "2.0", ...}
    """
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            payload = line[len("data:"):].strip()
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                continue
    # Fallback: try parsing entire body as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"Could not parse SSE/JSON response: {text[:200]}")
        return {}


class MCPServerConnection:
    """Single MCP server connection."""

    def __init__(self, name: str, base_url: str):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.endpoint = f"{self.base_url}/mcp"
        self.session_id: str | None = None
        self.tools: list[dict] = []
        self._initialized = False

    async def initialize(self) -> bool:
        """Initialize MCP session and discover tools."""
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                # Step 1: Initialize session
                init_resp = await client.post(
                    self.endpoint,
                    json={
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "initialize",
                        "params": {
                            "protocolVersion": "2025-06-18",
                            "capabilities": {},
                            "clientInfo": {"name": "ToothFairy", "version": "1.0"},
                        },
                    },
                    headers=self._headers(),
                )

                if init_resp.status_code != 200:
                    logger.error(f"[{self.name}] Init failed: {init_resp.status_code}")
                    return False

                self.session_id = init_resp.headers.get("mcp-session-id")
                logger.info(f"[{self.name}] Initialized, session={self.session_id}")

                # Step 2: Send initialized notification
                await client.post(
                    self.endpoint,
                    json={
                        "jsonrpc": "2.0",
                        "method": "notifications/initialized",
                        "params": {},
                    },
                    headers=self._headers(),
                )

                # Step 3: List tools
                tools_resp = await client.post(
                    self.endpoint,
                    json={
                        "jsonrpc": "2.0",
                        "id": 2,
                        "method": "tools/list",
                        "params": {},
                    },
                    headers=self._headers(),
                )

                if tools_resp.status_code == 200:
                    data = _parse_sse_json(tools_resp.text)
                    self.tools = data.get("result", {}).get("tools", [])
                    logger.info(f"[{self.name}] Discovered {len(self.tools)} tools: {[t['name'] for t in self.tools]}")

                self._initialized = True
                return True

        except Exception as e:
            logger.error(f"[{self.name}] Init error: {e}")
            return False

    async def call_tool(self, tool_name: str, arguments: dict) -> Any:
        """Call a tool on this MCP server."""
        if not self._initialized:
            await self.initialize()

        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                resp = await client.post(
                    self.endpoint,
                    json={
                        "jsonrpc": "2.0",
                        "id": 3,
                        "method": "tools/call",
                        "params": {
                            "name": tool_name,
                            "arguments": arguments,
                        },
                    },
                    headers=self._headers(),
                )

                if resp.status_code == 200:
                    data = _parse_sse_json(resp.text)
                    result = data.get("result", {})
                    # MCP tool results are in result.content[].text
                    content = result.get("content", [])
                    texts = [c.get("text", "") for c in content if c.get("type") == "text"]
                    return "\n".join(texts) if texts else str(result)
                else:
                    logger.error(f"[{self.name}] Tool call failed: {resp.status_code} {resp.text[:200]}")
                    return None

        except Exception as e:
            logger.error(f"[{self.name}] Tool call error: {e}")
            return None

    def _headers(self) -> dict:
        h = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self.session_id:
            h["mcp-session-id"] = self.session_id
        return h

    def get_tool_names(self) -> list[str]:
        return [t["name"] for t in self.tools]


class MCPManager:
    """Manages multiple MCP server connections."""

    def __init__(self):
        self.servers: dict[str, MCPServerConnection] = {}
        self._tool_to_server: dict[str, str] = {}

    def register(self, name: str, base_url: str):
        self.servers[name] = MCPServerConnection(name, base_url)

    async def initialize_all(self):
        """Initialize all registered servers."""
        for name, server in self.servers.items():
            ok = await server.initialize()
            if ok:
                for tool_name in server.get_tool_names():
                    self._tool_to_server[tool_name] = name

    async def ensure_initialized(self):
        """Initialize if not already done."""
        for server in self.servers.values():
            if not server._initialized:
                await self.initialize_all()
                return

    async def call_tool(self, tool_name: str, arguments: dict) -> Any:
        """Route a tool call to the right server."""
        await self.ensure_initialized()

        server_name = self._tool_to_server.get(tool_name)
        if not server_name:
            logger.warning(f"Unknown MCP tool: {tool_name}")
            return None

        return await self.servers[server_name].call_tool(tool_name, arguments)

    def get_all_tools(self) -> list[dict]:
        """Get all tools from all servers."""
        all_tools = []
        for server in self.servers.values():
            for tool in server.tools:
                all_tools.append({**tool, "_server": server.name})
        return all_tools

    def get_gemini_function_declarations(self):
        """Convert MCP tool schemas to Gemini function declarations."""
        from google.genai import types

        declarations = []
        for tool in self.get_all_tools():
            schema = tool.get("inputSchema", {})
            # Convert JSON Schema properties to Gemini-compatible schema
            properties = {}
            required = schema.get("required", [])
            for prop_name, prop_schema in schema.get("properties", {}).items():
                prop_type = prop_schema.get("type", "string").upper()
                type_map = {
                    "STRING": "STRING",
                    "INTEGER": "INTEGER",
                    "NUMBER": "NUMBER",
                    "BOOLEAN": "BOOLEAN",
                    "ARRAY": "ARRAY",
                    "OBJECT": "OBJECT",
                }
                properties[prop_name] = types.Schema(
                    type=type_map.get(prop_type, "STRING"),
                    description=prop_schema.get("description", ""),
                )

            decl = types.FunctionDeclaration(
                name=tool["name"],
                description=tool.get("description", ""),
                parameters=types.Schema(
                    type="OBJECT",
                    properties=properties,
                    required=required,
                ) if properties else None,
            )
            declarations.append(decl)

        return declarations


# Singleton — configured at startup
mcp_manager = MCPManager()
# mcp_manager.register("medical", "http://localhost:8001")  # disabled — PubMed rate limits
mcp_manager.register("pharmacy", "http://localhost:8002")
