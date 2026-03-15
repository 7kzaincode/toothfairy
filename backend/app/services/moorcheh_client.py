"""Moorcheh AI Client - Universal Memory Layer (MUMLA)

Provides longitudinal patient memory via semantic search.
Stores and retrieves historical patient data (past diagnoses, session notes)
so the clinical notes copilot can reference prior visits.

Namespace strategy: one namespace per patient, named by patient_id
(e.g. "sarah-chen", "john-doe"). This keeps data isolated per patient
and avoids metadata filtering at query time.
"""

import logging
import re
from typing import Optional

from moorcheh_sdk import MoorchehClient
from moorcheh_sdk.types.document import Document
from moorcheh_sdk.exceptions import NamespaceNotFound

from app.core.config import settings

logger = logging.getLogger(__name__)


def _patient_namespace(patient_id: str) -> str:
    """Convert a patient_id into a valid Moorcheh namespace name.

    E.g. "patient-sarah-chen" -> "sarah-chen", "patient_001" -> "patient-001"
    """
    name = patient_id.lower().strip()
    # Strip common prefixes
    name = re.sub(r"^patient[-_]?", "", name)
    # Replace underscores/spaces with hyphens, remove invalid chars
    name = re.sub(r"[_\s]+", "-", name)
    name = re.sub(r"[^a-z0-9\-]", "", name)
    return name or patient_id


class MoorchehService:
    """Wrapper around MoorchehClient for patient memory ingestion and retrieval."""

    def __init__(self, api_key: str):
        self._available = bool(api_key)
        if self._available:
            self.client = MoorchehClient(api_key=api_key)
        else:
            self.client = None

    @property
    def is_available(self) -> bool:
        return self._available

    def _ensure_namespace(self, namespace: str) -> None:
        """Create a patient namespace if it doesn't exist."""
        try:
            self.client.namespaces.create(namespace_name=namespace, type="text")
        except Exception:
            # Namespace likely already exists
            pass

    async def ingest_session(
        self,
        patient_id: str,
        session_data: dict,
        session_date: str,
    ) -> None:
        """Store a completed session's patient state into the patient's namespace."""
        if not self._available:
            logger.warning("Moorcheh not configured, skipping ingestion")
            return

        namespace = _patient_namespace(patient_id)

        try:
            self._ensure_namespace(namespace)
            documents = self._session_to_documents(patient_id, session_data, session_date)
            if documents:
                self.client.upload_documents(
                    namespace_name=namespace,
                    documents=documents,
                )
                logger.info(
                    f"Ingested {len(documents)} document(s) into namespace '{namespace}' "
                    f"(session date: {session_date})"
                )
        except Exception as e:
            logger.error(f"Moorcheh ingestion failed for {namespace}: {e}")

    async def retrieve_history(
        self,
        patient_id: str,
        query: str,
        top_k: int = 3,
    ) -> str:
        """Search the patient's namespace for historical records matching the query."""
        if not self._available:
            return ""

        namespace = _patient_namespace(patient_id)

        try:
            response = self.client.search(
                namespaces=[namespace],
                query=query,
                top_k=top_k,
                threshold=0.1,
            )

            results = response.get("results", []) if isinstance(response, dict) else getattr(response, "results", [])

            if not results:
                return ""

            history_parts = []
            for result in results:
                metadata = result.get("metadata", {}) if isinstance(result, dict) else getattr(result, "metadata", {})
                date = metadata.get("date", "unknown date")
                text = result.get("text", "") if isinstance(result, dict) else getattr(result, "text", "")
                if text:
                    history_parts.append(f"[Visit — {date}]\n{text}")

            return "\n\n".join(history_parts)

        except NamespaceNotFound:
            logger.info(f"Namespace '{namespace}' not found, no history for this patient")
            return ""
        except Exception as e:
            logger.error(f"Moorcheh retrieval failed for {namespace}: {e}")
            return ""

    def _session_to_documents(
        self,
        patient_id: str,
        session_data: dict,
        session_date: str,
    ) -> list[Document]:
        """Convert a session's patient state into indexable documents."""
        documents: list[Document] = []
        metadata_base = {"patient_id": patient_id, "date": session_date}
        doc_id_base = f"{patient_id}_{session_date}"

        # Document 1: Tooth chart findings
        tooth_chart = session_data.get("tooth_chart", {})
        if tooth_chart:
            findings_lines = []
            for tooth_num, finding in tooth_chart.items():
                if isinstance(finding, dict):
                    condition = finding.get("condition", "unknown")
                    severity = finding.get("severity", "unknown")
                    location = finding.get("location_description", "")
                    findings_lines.append(
                        f"Tooth #{tooth_num}: {condition} ({severity}). {location}"
                    )
            if findings_lines:
                documents.append(Document(
                    id=f"{doc_id_base}_findings",
                    text=f"Dental findings on {session_date}:\n" + "\n".join(findings_lines),
                    metadata={**metadata_base, "type": "findings"},
                ))

        # Document 2: Clinical notes summary
        clinical_output = session_data.get("clinical_notes_output", {})
        if clinical_output:
            dentist_summary = clinical_output.get("dentist_summary", "")
            patient_summary = clinical_output.get("patient_summary", "")
            summary_text = dentist_summary or patient_summary
            if summary_text:
                documents.append(Document(
                    id=f"{doc_id_base}_summary",
                    text=f"Clinical assessment on {session_date}:\n{summary_text}",
                    metadata={**metadata_base, "type": "clinical_summary"},
                ))

        # Document 3: Treatment timeline
        timeline = clinical_output.get("timeline", []) if clinical_output else []
        if timeline:
            timeline_lines = []
            for entry in timeline:
                if isinstance(entry, dict):
                    tooth = entry.get("tooth_number", "?")
                    treatment = entry.get("treatment", "")
                    urgency = entry.get("urgency", "")
                    timeline_lines.append(
                        f"Tooth #{tooth}: {treatment} (urgency: {urgency})"
                    )
            if timeline_lines:
                documents.append(Document(
                    id=f"{doc_id_base}_treatment",
                    text=f"Treatment plan on {session_date}:\n" + "\n".join(timeline_lines),
                    metadata={**metadata_base, "type": "treatment_plan"},
                ))

        return documents


# Singleton instance
moorcheh_service = MoorchehService(api_key=settings.MOORCHEH_API_KEY)
