"""Session Manager

Manages session lifecycle and patient state.
In-memory store — no persistence between restarts.
"""

import uuid
from typing import Optional
from datetime import datetime

from app.models.patient_state import PatientState, SessionIdentifiers


class SessionManager:
    """In-memory session manager for Tooth Fairy backend."""

    def __init__(self):
        self._sessions: dict[str, PatientState] = {}

    def create_session(
        self,
        case_id: str = "demo-dental-001",
        patient_id: str = "patient-001",
    ) -> PatientState:
        session_id = f"sess-{uuid.uuid4().hex[:12]}"
        identifiers = SessionIdentifiers(
            session_id=session_id,
            case_id=case_id,
            patient_id=patient_id,
        )
        patient_state = PatientState(identifiers=identifiers)
        self._sessions[session_id] = patient_state
        print(f"  Session created: {session_id}")
        return patient_state

    def get_session(self, session_id: str) -> Optional[PatientState]:
        return self._sessions.get(session_id)

    def update_session(self, session_id: str, patient_state: PatientState) -> bool:
        if session_id not in self._sessions:
            return False
        patient_state.increment_action_count()
        self._sessions[session_id] = patient_state
        return True

    def end_session(self, session_id: str) -> bool:
        if session_id not in self._sessions:
            return False
        patient_state = self._sessions[session_id]
        del self._sessions[session_id]
        print(f"  Session ended: {session_id} (actions: {patient_state.action_count})")
        return True

    def list_sessions(self) -> list[dict]:
        return [
            {
                "session_id": state.identifiers.session_id,
                "case_id": state.identifiers.case_id,
                "patient_id": state.identifiers.patient_id,
                "created_at": state.created_at.isoformat(),
                "action_count": state.action_count,
            }
            for state in self._sessions.values()
        ]

    def get_session_count(self) -> int:
        return len(self._sessions)

    def get_session_age(self, session_id: str) -> Optional[float]:
        patient_state = self.get_session(session_id)
        if not patient_state:
            return None
        return (datetime.utcnow() - patient_state.created_at).total_seconds()

    def session_exists(self, session_id: str) -> bool:
        return session_id in self._sessions

    def delete_session(self, session_id: str) -> bool:
        return self.end_session(session_id)


session_manager = SessionManager()
