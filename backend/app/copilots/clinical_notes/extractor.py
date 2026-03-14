"""Dental Diagnosis Extractor

Parses clinical notes text to extract structured dental diagnoses.
Uses regex patterns for common dental notation.
"""

import re
from app.models.patient_state import ToothFinding


# Common dental condition patterns
CONDITION_PATTERNS = {
    r"(?:MOD|MO|DO|OD|OM|OL|OB|MOB|DOL)\s*caries": "cavity",
    r"caries\s*(?:extending|into|to)": "cavity",
    r"(?:deep|moderate|mild|incipient)\s*caries": "cavity",
    r"periapical\s*(?:radiolucency|lesion|pathology|abscess)": "periapical_lesion",
    r"bone\s*loss": "bone_loss",
    r"pocket\s*depth": "bone_loss",
    r"periodontitis": "bone_loss",
    r"impacted|impaction": "impacted",
    r"partially\s*erupted": "impacted",
    r"root\s*canal": "root_canal_needed",
    r"pulp\s*(?:necrosis|exposure|involvement)": "root_canal_needed",
    r"fracture|fractured|cracked": "fracture",
    r"crown\s*(?:defect|fracture|breakdown)": "crown_defect",
    r"missing\s*tooth|edentulous": "missing",
    r"abscess": "abscess",
    r"gingivitis": "gingivitis",
}

# Severity indicators
SEVERITY_MAP = {
    "severe": "severe",
    "advanced": "severe",
    "significant": "severe",
    "moderate": "moderate",
    "mild": "mild",
    "slight": "mild",
    "incipient": "mild",
    "early": "mild",
}

# Tooth number patterns: #14, #36, tooth 14, etc.
TOOTH_PATTERN = re.compile(r"#(\d{1,2})\b|tooth\s*(\d{1,2})", re.IGNORECASE)


def extract_dental_diagnoses(text: str) -> list[ToothFinding]:
    """Extract dental diagnoses from clinical notes text.

    Args:
        text: Clinical notes text (highlighted or full)

    Returns:
        List of ToothFinding objects
    """
    findings = []
    text_lower = text.lower()

    # Split text into segments by tooth references or sentences
    sentences = re.split(r"[.;\n]", text)

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        sentence_lower = sentence.lower()

        # Find tooth numbers in this sentence
        tooth_numbers = []
        for match in TOOTH_PATTERN.finditer(sentence):
            num = int(match.group(1) or match.group(2))
            if 11 <= num <= 48:
                tooth_numbers.append(num)

        # Find conditions in this sentence
        conditions_found = []
        for pattern, condition in CONDITION_PATTERNS.items():
            if re.search(pattern, sentence_lower):
                conditions_found.append(condition)

        # Find severity
        severity = "moderate"  # default
        for keyword, sev in SEVERITY_MAP.items():
            if keyword in sentence_lower:
                severity = sev
                break

        # Find location description
        location = ""
        location_patterns = [
            r"mesial", r"distal", r"occlusal", r"buccal", r"lingual",
            r"palatal", r"labial", r"interproximal",
        ]
        found_locations = [p for p in location_patterns if re.search(p, sentence_lower)]
        if found_locations:
            location = " ".join(found_locations) + " surface"

        # Create findings for each tooth + condition combination
        if tooth_numbers and conditions_found:
            for tooth_num in tooth_numbers:
                for condition in conditions_found:
                    findings.append(ToothFinding(
                        tooth_number=tooth_num,
                        condition=condition,
                        severity=severity,
                        confidence=0.85,
                        location_description=location or sentence.strip()[:80],
                    ))
        elif conditions_found and not tooth_numbers:
            # Condition found but no tooth number — assign to general
            for condition in conditions_found:
                findings.append(ToothFinding(
                    tooth_number=0,
                    condition=condition,
                    severity=severity,
                    confidence=0.6,
                    location_description=sentence.strip()[:80],
                ))

    # Deduplicate by (tooth_number, condition)
    seen = set()
    unique_findings = []
    for f in findings:
        key = (f.tooth_number, f.condition)
        if key not in seen:
            seen.add(key)
            unique_findings.append(f)

    return unique_findings
