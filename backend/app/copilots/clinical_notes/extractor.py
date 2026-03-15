"""Dental Diagnosis Extractor

Parses clinical notes text to extract structured dental diagnoses.
Two paths:
  1. LLM (Gemini) — structured extraction via prompt (primary)
  2. Regex — pattern matching fallback when Gemini is unavailable
"""

import re
import logging
from app.models.patient_state import ToothFinding
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)

# Valid conditions the system understands
VALID_CONDITIONS = {
    "cavity", "periapical_lesion", "bone_loss", "impacted",
    "root_canal_needed", "fracture", "gingivitis", "abscess",
    "crown_defect", "missing", "root_resorption",
}

VALID_SEVERITIES = {"mild", "moderate", "severe"}

# ===========================
# LLM Extraction
# ===========================

async def extract_dental_diagnoses_llm(text: str) -> list[ToothFinding]:
    """Extract diagnoses using Gemini structured output.

    Returns list of ToothFinding or raises on failure.
    """
    raw_findings = await llm_client.parse_clinical_notes(text)

    findings = []
    for item in raw_findings:
        try:
            condition = item.get("condition", "").lower().replace(" ", "_")
            if condition not in VALID_CONDITIONS:
                logger.warning(f"LLM returned unknown condition '{condition}', skipping")
                continue

            severity = item.get("severity", "moderate").lower()
            if severity not in VALID_SEVERITIES:
                severity = "moderate"

            tooth_num = int(item.get("tooth_number", 0))
            if tooth_num < 11 or tooth_num > 48:
                logger.warning(f"LLM returned invalid tooth number {tooth_num}, skipping")
                continue

            confidence = float(item.get("confidence", 0.85))
            confidence = max(0.0, min(1.0, confidence))

            findings.append(ToothFinding(
                tooth_number=tooth_num,
                condition=condition,
                severity=severity,
                confidence=confidence,
                location_description=str(item.get("location_description", ""))[:120],
            ))
        except (ValueError, TypeError) as e:
            logger.warning(f"Skipping malformed LLM finding: {e}")
            continue

    # Deduplicate and filter root_canal_needed when periapical_lesion exists
    findings = _deduplicate(findings)
    tooth_conditions: dict[int, set[str]] = {}
    for f in findings:
        tooth_conditions.setdefault(f.tooth_number, set()).add(f.condition)
    findings = [
        f for f in findings
        if not (f.condition == "root_canal_needed"
                and "periapical_lesion" in tooth_conditions.get(f.tooth_number, set()))
    ]
    return findings


# ===========================
# Regex Extraction (fallback)
# ===========================

# Common dental condition patterns
CONDITION_PATTERNS = {
    r"(?:MOD|MO|DO|OD|OM|OL|OB|MOB|DOL)\s*caries": "cavity",
    r"caries\s*(?:extending|into|to)": "cavity",
    r"(?:deep|moderate|mild|incipient|secondary|recurrent|occlusal|mesial|distal|pit)\s*caries": "cavity",
    r"(?:caries|decay)\s*(?:detected|noted|suspected|observed|present|visible)": "cavity",
    r"\bcaries\b": "cavity",
    r"periapical\s*(?:radiolucency|lesion|pathology|abscess)": "periapical_lesion",
    r"pulp\s*necrosis": "periapical_lesion",
    r"bone\s*loss": "bone_loss",
    r"pocket\s*depth": "bone_loss",
    r"periodontitis": "bone_loss",
    r"horizontal\s*bone\s*loss": "bone_loss",
    r"impacted|impaction": "impacted",
    r"partially\s*erupted": "impacted",
    r"pericoronitis": "impacted",
    r"root\s*canal": "root_canal_needed",
    r"pulp\s*(?:exposure|involvement)": "root_canal_needed",
    r"fracture|fractured|cracked|crack\s*line": "fracture",
    r"crown\s*(?:defect|fracture|breakdown)": "crown_defect",
    r"occlusal\s*adjustment": "crown_defect",
    r"high\s*(?:occlusal|bite)\s*contact": "crown_defect",
    r"missing\s*tooth|edentulous": "missing",
    r"abscess": "abscess",
    r"gingivitis|gingival\s*inflammation|bleeding\s*on\s*probing": "gingivitis",
    r"recession|cervical\s*abrasion": "gingivitis",
    r"root\s*resorption": "root_resorption",
    r"erosion|demineralization|white\s*spot": "cavity",
}

# Severity indicators
SEVERITY_MAP = {
    "severe": "severe",
    "advanced": "severe",
    "significant": "severe",
    "extensive": "severe",
    "moderate": "moderate",
    "mild": "mild",
    "slight": "mild",
    "incipient": "mild",
    "early": "mild",
}

# Tooth number patterns: #14, #36, tooth 14, etc.
TOOTH_PATTERN = re.compile(r"#(\d{1,2})\b|tooth\s*(\d{1,2})", re.IGNORECASE)


def extract_dental_diagnoses_regex(text: str) -> list[ToothFinding]:
    """Extract dental diagnoses from clinical notes using regex patterns.

    Args:
        text: Clinical notes text (highlighted or full)

    Returns:
        List of ToothFinding objects
    """
    findings = []

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

        # Skip sentences with negation (e.g. "no recurrent caries", "no pathology")
        if re.search(r"\bno\s+(?:recurrent|visible|apparent|significant|acute)\b", sentence_lower):
            continue
        if re.search(r"\bno\s+(?:caries|decay|pathology|lesion|fracture|impaction)\b", sentence_lower):
            continue
        if re.search(r"\bintact\b.*\bno\b|\bno\b.*\bintervention\b", sentence_lower):
            continue

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

        # Create findings only when we have both tooth number and condition
        # Skip findings without a tooth number (no "Tooth #0" entries)
        if tooth_numbers and conditions_found:
            for tooth_num in tooth_numbers:
                for condition in conditions_found:
                    # Only use real anatomical location, leave empty otherwise
                    desc = location if location else ""
                    findings.append(ToothFinding(
                        tooth_number=tooth_num,
                        condition=condition,
                        severity=severity,
                        confidence=0.85,
                        location_description=desc,
                    ))

    # If a tooth has both periapical_lesion and root_canal_needed,
    # keep only periapical_lesion (root canal is the treatment, not diagnosis)
    findings = _deduplicate(findings)
    tooth_conditions: dict[int, set[str]] = {}
    for f in findings:
        tooth_conditions.setdefault(f.tooth_number, set()).add(f.condition)
    findings = [
        f for f in findings
        if not (f.condition == "root_canal_needed"
                and "periapical_lesion" in tooth_conditions.get(f.tooth_number, set()))
    ]
    return findings


# ===========================
# Unified entry point
# ===========================

async def extract_diagnoses(text: str, use_llm: bool = True) -> tuple[list[ToothFinding], str]:
    """Extract dental diagnoses, trying LLM first with regex fallback.

    Args:
        text: Clinical notes text
        use_llm: Whether to attempt LLM extraction

    Returns:
        Tuple of (findings, provenance) where provenance is "gemini", "regex", or "fallback-regex"
    """
    if use_llm and llm_client.is_available:
        try:
            findings = await extract_dental_diagnoses_llm(text)
            if findings:
                logger.info(f"LLM extraction returned {len(findings)} findings")
                return findings, "gemini"
            else:
                logger.warning("LLM extraction returned empty results, falling back to regex")
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}, falling back to regex")

        # Fallback to regex after LLM failure
        findings = extract_dental_diagnoses_regex(text)
        return findings, "fallback-regex"

    # Regex-only path
    findings = extract_dental_diagnoses_regex(text)
    return findings, "regex"


def _deduplicate(findings: list[ToothFinding]) -> list[ToothFinding]:
    """Deduplicate findings by (tooth_number, condition)."""
    seen = set()
    unique = []
    for f in findings:
        key = (f.tooth_number, f.condition)
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return unique
