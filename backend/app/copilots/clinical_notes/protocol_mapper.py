"""Protocol Mapper

Maps dental conditions to treatment protocols.
Uses hardcoded clinical knowledge base.
"""

from typing import Optional
from app.models.patient_state import TreatmentProtocol


# Condition -> Treatment protocol mapping
PROTOCOL_MAP = {
    "cavity": {
        "mild": {
            "treatment": "Fluoride treatment and monitoring",
            "urgency": "routine",
            "visits": 1,
            "explanation": "You have an early-stage cavity that we can treat with fluoride to help remineralize the tooth.",
            "cdt": "D1206",
            "cost": "$30-60",
        },
        "moderate": {
            "treatment": "Composite restoration (filling)",
            "urgency": "soon",
            "visits": 1,
            "explanation": "You have a cavity that needs a filling. We'll remove the decay and fill it with a tooth-colored material.",
            "cdt": "D2392",
            "cost": "$150-300",
        },
        "severe": {
            "treatment": "Crown or onlay restoration",
            "urgency": "immediate",
            "visits": 2,
            "explanation": "This cavity is extensive and the tooth needs a crown to protect it. This usually takes two visits.",
            "cdt": "D2740",
            "cost": "$800-1500",
        },
    },
    "periapical_lesion": {
        "mild": {
            "treatment": "Monitoring with follow-up radiograph",
            "urgency": "routine",
            "visits": 1,
            "explanation": "We found a small area of concern at the root tip. We'll monitor it at your next visit.",
            "cdt": "D0220",
            "cost": "$25-50",
        },
        "moderate": {
            "treatment": "Root canal therapy (endodontic treatment)",
            "urgency": "immediate",
            "visits": 2,
            "explanation": "The nerve of this tooth is likely infected. Root canal treatment will remove the infection and save the tooth.",
            "cdt": "D3330",
            "cost": "$700-1200",
        },
        "severe": {
            "treatment": "Root canal therapy + apicoectomy referral",
            "urgency": "immediate",
            "visits": 3,
            "explanation": "This tooth has a significant infection. We'll need root canal treatment and may need to refer you to a specialist.",
            "cdt": "D3330",
            "cost": "$1200-2500",
        },
    },
    "bone_loss": {
        "mild": {
            "treatment": "Scaling and root planing (deep cleaning)",
            "urgency": "soon",
            "visits": 2,
            "explanation": "Your gums need a deep cleaning to remove bacteria below the gumline and help the bone heal.",
            "cdt": "D4341",
            "cost": "$200-400",
        },
        "moderate": {
            "treatment": "Scaling and root planing + chlorhexidine therapy",
            "urgency": "soon",
            "visits": 2,
            "explanation": "You have moderate gum disease. We'll do a deep cleaning and prescribe a medicated rinse.",
            "cdt": "D4341",
            "cost": "$300-600",
        },
        "severe": {
            "treatment": "Periodontal surgery referral",
            "urgency": "immediate",
            "visits": 4,
            "explanation": "The bone loss is significant. You'll need to see a gum specialist (periodontist) for treatment.",
            "cdt": "D4260",
            "cost": "$1000-3000",
        },
    },
    "impacted": {
        "mild": {
            "treatment": "Monitoring",
            "urgency": "monitor",
            "visits": 1,
            "explanation": "This tooth is partially impacted but not causing problems. We'll keep an eye on it.",
            "cdt": "D0330",
            "cost": "$50-100",
        },
        "moderate": {
            "treatment": "Surgical extraction",
            "urgency": "soon",
            "visits": 1,
            "explanation": "This impacted tooth should be removed to prevent future problems. It's a routine surgical procedure.",
            "cdt": "D7240",
            "cost": "$300-600",
        },
        "severe": {
            "treatment": "Surgical extraction under sedation",
            "urgency": "immediate",
            "visits": 1,
            "explanation": "This impacted tooth needs to come out soon. We'll refer you to an oral surgeon.",
            "cdt": "D7241",
            "cost": "$500-1000",
        },
    },
    "root_canal_needed": {
        "mild": {"treatment": "Pulp capping and monitoring", "urgency": "soon", "visits": 1, "explanation": "The nerve is slightly exposed. We can try to protect it and monitor.", "cdt": "D3110", "cost": "$100-200"},
        "moderate": {"treatment": "Root canal therapy", "urgency": "immediate", "visits": 2, "explanation": "Root canal treatment is needed to save this tooth.", "cdt": "D3330", "cost": "$700-1200"},
        "severe": {"treatment": "Root canal therapy + crown", "urgency": "immediate", "visits": 3, "explanation": "You'll need root canal treatment followed by a crown to protect the tooth.", "cdt": "D3330", "cost": "$1500-2500"},
    },
    "fracture": {
        "mild": {"treatment": "Bonding repair", "urgency": "soon", "visits": 1, "explanation": "We can repair this small chip with bonding material.", "cdt": "D2330", "cost": "$100-250"},
        "moderate": {"treatment": "Crown restoration", "urgency": "soon", "visits": 2, "explanation": "This fracture needs a crown to protect the tooth.", "cdt": "D2740", "cost": "$800-1500"},
        "severe": {"treatment": "Extraction and implant consultation", "urgency": "immediate", "visits": 2, "explanation": "Unfortunately this tooth can't be saved. We'll discuss replacement options.", "cdt": "D7140", "cost": "$150-300"},
    },
    "gingivitis": {
        "mild": {"treatment": "Professional cleaning + oral hygiene instruction", "urgency": "routine", "visits": 1, "explanation": "Your gums are slightly inflamed. A cleaning and better brushing will help.", "cdt": "D1110", "cost": "$80-150"},
        "moderate": {"treatment": "Deep cleaning (scaling)", "urgency": "soon", "visits": 1, "explanation": "Your gums need more attention. A thorough cleaning will help reduce inflammation.", "cdt": "D4341", "cost": "$200-400"},
        "severe": {"treatment": "Deep cleaning + follow-up", "urgency": "soon", "visits": 2, "explanation": "Significant gum inflammation that needs professional treatment.", "cdt": "D4341", "cost": "$300-600"},
    },
}


def map_condition_to_protocol(
    condition: str, tooth_number: int, severity: str = "moderate"
) -> Optional[TreatmentProtocol]:
    """Map a dental condition to a treatment protocol.

    Args:
        condition: Dental condition (e.g., "cavity", "bone_loss")
        tooth_number: FDI tooth number
        severity: "mild", "moderate", or "severe"

    Returns:
        TreatmentProtocol or None if condition not recognized
    """
    condition_lower = condition.lower().replace(" ", "_")
    severity_lower = severity.lower()

    if condition_lower not in PROTOCOL_MAP:
        return None

    severity_map = PROTOCOL_MAP[condition_lower]
    if severity_lower not in severity_map:
        severity_lower = "moderate"

    proto = severity_map[severity_lower]

    return TreatmentProtocol(
        condition=condition,
        tooth_number=tooth_number,
        recommended_treatment=proto["treatment"],
        urgency=proto["urgency"],
        estimated_visits=proto["visits"],
        patient_explanation=proto["explanation"],
        cdt_code=proto.get("cdt"),
        estimated_cost=proto.get("cost"),
    )
