"""Treatment Copilot Handler

Uses Gemini LLM with MCP tools (Medical + Pharmacy) to look up
evidence-based treatment guidelines. Falls back to cached data.
"""

import json
import time
import logging
from app.core.config import settings
from app.core.log_emitter import log_emitter
from app.api.dependencies import cache_manager
from app.models.logs import CopilotType
from app.models.treatment import TreatmentActionRequest, TreatmentActionResponse
from app.models.patient_state import PatientState, TreatmentOutput, TreatmentProvenance
from app.services.llm_client import llm_client
from app.services.mcp_client import mcp_manager

logger = logging.getLogger(__name__)

TREATMENT_SYSTEM_PROMPT = """You are a dental treatment evidence specialist. Given a dental condition, use the available pharmacy/drug tools to find relevant medications, then combine that with your own clinical knowledge.

Your goal is to provide:
1. A concise evidence summary (2-3 sentences about the standard of care)
2. Success rate (e.g. "92-95%" based on your clinical knowledge)
3. Risk factors (list of 2-4 key risks)
4. Treatment alternatives (list of 2-3 alternatives)
5. Patient education points (1-2 sentences for patient communication)

IMPORTANT: Use the pharmacy/drug database tools to search for medications commonly prescribed for this dental condition (e.g. antibiotics, analgesics, antiseptics). Make at least one pharmacy tool call. Use your own clinical knowledge for treatment protocols and success rates.

Return your response as JSON with these exact fields:
{
  "evidence_summary": "string",
  "success_rate": "string",
  "risk_factors": ["string", ...],
  "alternatives": ["string", ...],
  "patient_education": "string",
  "pharmacy_medications": [{"drug_name": "string", "din": "string", "form": "string", "schedule": "string"}, ...]
}

Return ONLY valid JSON. No markdown, no explanation."""


class TreatmentHandler:
    """Handles treatment evidence lookup using MCP tools + Gemini."""

    async def handle_evidence_lookup(
        self, request: TreatmentActionRequest, patient_state: PatientState
    ) -> TreatmentActionResponse:
        start_time = time.time()
        session_id = request.session_id
        copilot = CopilotType.TREATMENT

        await log_emitter.emit_info(session_id, copilot, f"Looking up evidence for: {request.condition}")

        # Use cache only — MCP+Gemini disabled to conserve API quota
        if False:
            try:
                logger.info("Starting LLM+MCP treatment lookup...")
                response = await self._llm_mcp_lookup(request, session_id, copilot, start_time)
                if response:
                    logger.info(f"LLM+MCP returned provenance={response.provenance}, summary={response.evidence_summary[:80] if response.evidence_summary else 'EMPTY'}")
                    self._update_patient_state(patient_state, response, start_time)
                    return response
                else:
                    logger.warning("LLM+MCP returned None, falling back to cache")
            except Exception as e:
                logger.error(f"LLM+MCP treatment lookup failed: {e}", exc_info=True)
                await log_emitter.emit_fallback(session_id, copilot, f"LLM lookup failed: {e}, trying cache")

        # Fall back to cache
        evidence = cache_manager.get_treatment_evidence(request.condition)
        elapsed_ms = int((time.time() - start_time) * 1000)

        if evidence:
            await log_emitter.emit_success(session_id, copilot, "Found cached evidence data")
            # Coerce success_rate to string (cache files may store it as float)
            raw_rate = evidence.get("success_rate")
            if raw_rate is not None and not isinstance(raw_rate, str):
                raw_rate = f"{float(raw_rate) * 100:.0f}%" if isinstance(raw_rate, (int, float)) and raw_rate <= 1 else str(raw_rate)
            response = TreatmentActionResponse(
                session_id=session_id,
                condition=request.condition,
                tooth_number=request.tooth_number,
                evidence_summary=evidence.get("summary"),
                success_rate=raw_rate,
                risk_factors=evidence.get("risk_factors"),
                alternatives=evidence.get("alternatives"),
                referral_summary=evidence.get("referral_summary"),
                patient_education=evidence.get("patient_education"),
                provenance="cached",
                inference_time_ms=elapsed_ms,
            )
        else:
            await log_emitter.emit_fallback(session_id, copilot, "No evidence available")
            response = TreatmentActionResponse(
                session_id=session_id,
                condition=request.condition,
                tooth_number=request.tooth_number,
                evidence_summary=f"Evidence-based treatment information for {request.condition} is being compiled.",
                provenance="placeholder",
                inference_time_ms=elapsed_ms,
            )

        self._update_patient_state(patient_state, response, start_time)
        return response

    async def _llm_mcp_lookup(
        self, request: TreatmentActionRequest, session_id: str, copilot: CopilotType, start_time: float
    ) -> TreatmentActionResponse | None:
        """Use Gemini with MCP tools for evidence lookup."""
        from google import genai
        from google.genai import types
        from app.core.config import settings

        # Initialize MCP connections and get tool declarations
        try:
            await mcp_manager.ensure_initialized()
        except Exception as e:
            logger.warning(f"MCP initialization failed: {e}")

        mcp_tools = mcp_manager.get_all_tools()
        has_mcp = bool(mcp_tools)

        if has_mcp:
            func_declarations = mcp_manager.get_gemini_function_declarations()
            await log_emitter.emit_info(
                session_id, copilot,
                f"Discovered {len(func_declarations)} MCP tools across {len(mcp_manager.servers)} servers"
            )
        else:
            await log_emitter.emit_info(session_id, copilot, "No MCP tools available, using Gemini alone")

        # Build prompt
        condition_display = request.condition.replace("_", " ")
        tooth_ctx = f" for tooth #{request.tooth_number}" if request.tooth_number else ""
        user_prompt = f"Research evidence-based treatment options for dental condition: {condition_display}{tooth_ctx}."
        if has_mcp:
            user_prompt += " Use the available tools to find drug information, clinical guidelines, and treatment protocols."

        # Call Gemini with or without function declarations
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        tools = [types.Tool(function_declarations=func_declarations)] if has_mcp else None

        contents = [
            types.Content(role="user", parts=[types.Part.from_text(text=f"{TREATMENT_SYSTEM_PROMPT}\n\n{user_prompt}")])
        ]

        # Agentic loop: let Gemini call tools iteratively
        max_turns = 5
        for turn in range(max_turns):
            response = await client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(tools=tools),
            )

            candidate = response.candidates[0]

            # Check if Gemini wants to call functions
            function_calls = [p for p in candidate.content.parts if p.function_call]

            if not function_calls:
                # Gemini is done — parse the final text response
                break

            # Execute each function call against MCP
            contents.append(candidate.content)
            tool_results = []

            for fc in function_calls:
                tool_name = fc.function_call.name
                tool_args = dict(fc.function_call.args) if fc.function_call.args else {}

                await log_emitter.emit_info(
                    session_id, copilot,
                    f"Calling MCP tool: {tool_name}({json.dumps(tool_args)[:100]})"
                )

                result = await mcp_manager.call_tool(tool_name, tool_args)
                result_text = str(result) if result else "No results found"

                # Truncate very long results
                if len(result_text) > 3000:
                    result_text = result_text[:3000] + "... (truncated)"

                tool_results.append(
                    types.Part.from_function_response(
                        name=tool_name,
                        response={"result": result_text},
                    )
                )

            contents.append(types.Content(role="user", parts=tool_results))

        # Parse final response — extract text parts safely
        final_text = ""
        try:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "text") and part.text:
                    final_text += part.text
        except Exception:
            pass

        # If no text (Gemini only returned function calls), do one more call asking for summary
        if not final_text.strip() and contents:
            try:
                summary_resp = await client.aio.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents + [
                        types.Content(role="user", parts=[
                            types.Part.from_text(text="Based on all the information gathered, provide your final evidence summary as JSON. No more tool calls.")
                        ])
                    ],
                )
                for part in summary_resp.candidates[0].content.parts:
                    if hasattr(part, "text") and part.text:
                        final_text += part.text
            except Exception as e:
                logger.warning(f"Summary call failed: {e}")

        elapsed_ms = int((time.time() - start_time) * 1000)

        await log_emitter.emit_success(
            session_id, copilot,
            f"LLM+MCP evidence lookup completed in {elapsed_ms}ms"
        )

        # Try to parse structured JSON from Gemini
        parsed = self._parse_evidence_json(final_text)

        return TreatmentActionResponse(
            session_id=session_id,
            condition=request.condition,
            tooth_number=request.tooth_number,
            evidence_summary=parsed.get("evidence_summary", final_text[:500]),
            success_rate=parsed.get("success_rate"),
            risk_factors=parsed.get("risk_factors"),
            alternatives=parsed.get("alternatives"),
            referral_summary=parsed.get("referral_summary"),
            patient_education=parsed.get("patient_education"),
            pharmacy_results=parsed.get("pharmacy_medications"),
            provenance="gemini+mcp" if has_mcp else "gemini",
            inference_time_ms=elapsed_ms,
        )

    def _parse_evidence_json(self, text: str) -> dict:
        """Parse JSON from Gemini response."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse treatment JSON, using raw text")
            return {"evidence_summary": cleaned[:500]}

    def _update_patient_state(
        self, patient_state: PatientState, response: TreatmentActionResponse, start_time: float
    ):
        elapsed_ms = int((time.time() - start_time) * 1000)
        patient_state.treatment_output = TreatmentOutput(
            evidence_summary=response.evidence_summary,
            success_rate=response.success_rate,
            risk_factors=response.risk_factors,
            alternatives=response.alternatives,
            referral_summary=response.referral_summary,
            patient_education=response.patient_education,
        )
        patient_state.treatment_provenance = TreatmentProvenance(
            fallback_used=(response.provenance != "gemini+mcp"),
            duration_ms=elapsed_ms,
        )
