"""Timeline Generator

Generates urgency-sorted treatment timeline from protocols.
"""

from app.models.patient_state import TreatmentProtocol

URGENCY_ORDER = {"immediate": 0, "soon": 1, "routine": 2, "monitor": 3}
URGENCY_COLORS = {"immediate": "#FF5C7A", "soon": "#F4C152", "routine": "#2BD4A7", "monitor": "#4C9AFF"}


def generate_timeline(protocols: list[TreatmentProtocol]) -> list[dict]:
    """Generate an urgency-sorted treatment timeline.

    Args:
        protocols: List of treatment protocols

    Returns:
        List of timeline entries sorted by urgency
    """
    sorted_protocols = sorted(
        protocols,
        key=lambda p: URGENCY_ORDER.get(p.urgency, 99),
    )

    timeline = []
    for i, proto in enumerate(sorted_protocols):
        timeline.append({
            "order": i + 1,
            "tooth_number": proto.tooth_number,
            "condition": proto.condition,
            "treatment": proto.recommended_treatment,
            "urgency": proto.urgency,
            "urgency_color": URGENCY_COLORS.get(proto.urgency, "#AAB4C5"),
            "estimated_visits": proto.estimated_visits,
            "cdt_code": proto.cdt_code,
            "estimated_cost": proto.estimated_cost,
        })

    return timeline
