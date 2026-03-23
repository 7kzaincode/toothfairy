"""PDF Report Generator

Generates a clean clinical PDF report from a PatientState session.
Designed to be handed to a patient or submitted to insurance.
"""

import io
from datetime import datetime
from pathlib import Path
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.patient_state import PatientState

# ── Palette ──────────────────────────────────────────────────────────────────
BLACK       = colors.HexColor("#171717")
GRAY_DARK   = colors.HexColor("#525252")
GRAY_MID    = colors.HexColor("#a3a3a3")
GRAY_LIGHT  = colors.HexColor("#f5f5f5")
BORDER      = colors.HexColor("#e5e5e5")
WHITE       = colors.white

SEV_SEVERE   = colors.HexColor("#FF5C7A")
SEV_MODERATE = colors.HexColor("#FF9F4A")
SEV_MILD     = colors.HexColor("#F4C152")
SEV_OK       = colors.HexColor("#16a34a")

URG_IMMEDIATE = colors.HexColor("#FF5C7A")
URG_SOON      = colors.HexColor("#FF9F4A")
URG_ROUTINE   = colors.HexColor("#2563eb")
URG_MONITOR   = colors.HexColor("#a3a3a3")

# ── Helpers ───────────────────────────────────────────────────────────────────

def _sev_color(severity: str) -> colors.Color:
    return {
        "severe": SEV_SEVERE,
        "moderate": SEV_MODERATE,
        "mild": SEV_MILD,
    }.get(severity.lower(), GRAY_MID)


def _urg_color(urgency: str) -> colors.Color:
    return {
        "immediate": URG_IMMEDIATE,
        "soon": URG_SOON,
        "routine": URG_ROUTINE,
        "monitor": URG_MONITOR,
    }.get(urgency.lower(), GRAY_MID)


def _fmt_date(dt: Optional[datetime]) -> str:
    if not dt:
        return datetime.utcnow().strftime("%B %d, %Y")
    return dt.strftime("%B %d, %Y")


def _fmt_condition(s: str) -> str:
    return s.replace("_", " ").title()


# ── Styles ────────────────────────────────────────────────────────────────────

def _build_styles():
    base = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        "practice": S("practice",
            fontName="Helvetica-Bold", fontSize=9,
            textColor=GRAY_MID, alignment=TA_RIGHT),
        "report_title": S("report_title",
            fontName="Helvetica-Bold", fontSize=22,
            textColor=BLACK, spaceAfter=10),
        "patient_name": S("patient_name",
            fontName="Helvetica-Bold", fontSize=16,
            textColor=BLACK, spaceAfter=4),
        "meta_label": S("meta_label",
            fontName="Helvetica", fontSize=8,
            textColor=GRAY_MID, spaceAfter=1),
        "meta_value": S("meta_value",
            fontName="Helvetica-Bold", fontSize=9,
            textColor=BLACK, spaceAfter=6),
        "section_title": S("section_title",
            fontName="Helvetica-Bold", fontSize=11,
            textColor=BLACK, spaceBefore=18, spaceAfter=6),
        "body": S("body",
            fontName="Helvetica", fontSize=9,
            textColor=GRAY_DARK, leading=14, spaceAfter=4),
        "mono": S("mono",
            fontName="Courier", fontSize=8,
            textColor=GRAY_DARK, leading=13),
        "table_header": S("table_header",
            fontName="Helvetica-Bold", fontSize=8,
            textColor=GRAY_MID, alignment=TA_LEFT),
        "table_cell": S("table_cell",
            fontName="Helvetica", fontSize=9,
            textColor=BLACK, leading=12),
        "table_cell_muted": S("table_cell_muted",
            fontName="Helvetica", fontSize=8,
            textColor=GRAY_DARK, leading=11),
        "badge": S("badge",
            fontName="Helvetica-Bold", fontSize=7.5,
            textColor=WHITE, alignment=TA_CENTER),
        "footer": S("footer",
            fontName="Helvetica", fontSize=7.5,
            textColor=GRAY_MID, alignment=TA_CENTER),
    }


# ── Section builders ──────────────────────────────────────────────────────────

def _section_rule(styles) -> list:
    return [HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=6)]


def _section_heading(title: str, styles) -> list:
    return [Paragraph(title, styles["section_title"])] + _section_rule(styles)


def _build_cover(state: PatientState, profile: Optional[dict], styles) -> list:
    elems = []

    # ── Header bar ──
    exam_date = _fmt_date(state.last_updated_at)
    header_data = [[
        Paragraph("Tooth Fairy Dental AI", styles["practice"]),
        Paragraph(f"Exam Date: {exam_date}", styles["practice"]),
    ]]
    header_tbl = Table(header_data, colWidths=["60%", "40%"])
    header_tbl.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    elems.append(header_tbl)
    elems.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=6, spaceAfter=14))

    # ── Patient name & report title ──
    patient_name = profile.get("name", state.identifiers.patient_id) if profile else state.identifiers.patient_id
    elems.append(Paragraph("Dental Examination Report", styles["report_title"]))
    elems.append(Paragraph(patient_name, styles["patient_name"]))
    elems.append(Spacer(1, 6))

    # ── Meta grid ──
    dob   = profile.get("date_of_birth", "—") if profile else "—"
    age   = str(profile.get("age", "—")) if profile else "—"
    ins   = profile.get("insurance", "—") if profile else "—"
    allg  = ", ".join(profile.get("allergies", ["None known"])) if profile else "None known"
    sess  = state.identifiers.session_id
    case  = state.identifiers.case_id

    def meta_pair(label: str, value: str):
        return [Paragraph(label.upper(), styles["meta_label"]),
                Paragraph(value, styles["meta_value"])]

    meta_data = [
        meta_pair("Date of Birth", dob) + meta_pair("Age", age),
        meta_pair("Insurance", ins)     + meta_pair("Allergies", allg),
        meta_pair("Session ID", sess)   + meta_pair("Case ID", case),
    ]

    meta_tbl = Table(meta_data, colWidths=["25%", "25%", "25%", "25%"])
    meta_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GRAY_LIGHT),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, GRAY_LIGHT]),
    ]))
    elems.append(meta_tbl)
    elems.append(Spacer(1, 16))

    # ── AI summary paragraph ──
    cn_out = state.clinical_notes_output
    if cn_out and cn_out.patient_summary:
        elems += _section_heading("Visit Summary", styles)
        elems.append(Paragraph(cn_out.patient_summary, styles["body"]))

    if cn_out and cn_out.dentist_summary:
        elems.append(Spacer(1, 6))
        elems += _section_heading("Clinical Assessment", styles)
        elems.append(Paragraph(cn_out.dentist_summary, styles["body"]))

    return elems


def _build_findings(state: PatientState, styles) -> list:
    elems = []

    findings = list(state.tooth_chart.values())
    if not findings:
        return elems

    elems += _section_heading("Findings", styles)

    # Determine source for each tooth
    imaging_teeth  = set()
    notes_teeth    = set()
    if state.imaging_output and state.imaging_output.findings:
        imaging_teeth = {f.tooth_number for f in state.imaging_output.findings}
    if state.clinical_notes_output and state.clinical_notes_output.diagnoses:
        notes_teeth   = {f.tooth_number for f in state.clinical_notes_output.diagnoses}

    def source_label(tn: int) -> str:
        in_img   = tn in imaging_teeth
        in_notes = tn in notes_teeth
        if in_img and in_notes:
            return "Imaging + Notes"
        if in_img:
            return "Imaging"
        if in_notes:
            return "Clinical Notes"
        return "—"

    # Table
    col_widths = [0.6*inch, 1.6*inch, 0.9*inch, 0.9*inch, 1.6*inch]
    header_row = [
        Paragraph("TOOTH", styles["table_header"]),
        Paragraph("CONDITION", styles["table_header"]),
        Paragraph("SEVERITY", styles["table_header"]),
        Paragraph("CONFIDENCE", styles["table_header"]),
        Paragraph("SOURCE", styles["table_header"]),
    ]

    rows = [header_row]
    sorted_findings = sorted(findings, key=lambda f: f.tooth_number)

    for f in sorted_findings:
        sev_color = _sev_color(f.severity)
        conf_pct  = f"{int(f.confidence * 100)}%" if f.confidence else "—"

        sev_badge = Table(
            [[Paragraph(f.severity.upper(), styles["badge"])]],
            colWidths=[0.65*inch],
        )
        sev_badge.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), sev_color),
            ("ROUNDEDCORNERS", [3]),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))

        rows.append([
            Paragraph(f"#{f.tooth_number}", styles["table_cell"]),
            Paragraph(_fmt_condition(f.condition), styles["table_cell"]),
            sev_badge,
            Paragraph(conf_pct, styles["table_cell"]),
            Paragraph(source_label(f.tooth_number), styles["table_cell_muted"]),
        ])

    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), GRAY_LIGHT),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_LIGHT]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elems.append(tbl)
    return elems


def _build_treatment(state: PatientState, styles) -> list:
    elems = []

    cn_out = state.clinical_notes_output
    protocols = cn_out.protocols if cn_out else None
    timeline  = sorted(cn_out.timeline, key=lambda e: e.get("order", 99)) if cn_out and cn_out.timeline else []

    if not protocols and not timeline:
        return elems

    elems += _section_heading("Treatment Plan", styles)

    # Use timeline if available (has CDT + cost), else fall back to protocols
    if timeline:
        col_widths = [0.3*inch, 0.55*inch, 1.5*inch, 1.55*inch, 0.85*inch, 0.75*inch, 0.85*inch]
        header_row = [
            Paragraph("#", styles["table_header"]),
            Paragraph("TOOTH", styles["table_header"]),
            Paragraph("CONDITION", styles["table_header"]),
            Paragraph("TREATMENT", styles["table_header"]),
            Paragraph("PRIORITY", styles["table_header"]),
            Paragraph("CDT", styles["table_header"]),
            Paragraph("EST. COST", styles["table_header"]),
        ]
        rows = [header_row]
        for entry in timeline:
            urg   = entry.get("urgency", "routine")
            color = _urg_color(urg)
            badge = Table([[Paragraph(urg.upper(), styles["badge"])]], colWidths=[0.7*inch])
            badge.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), color),
                ("TOPPADDING",    (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            rows.append([
                Paragraph(str(entry.get("order", "")), styles["table_cell_muted"]),
                Paragraph(f"#{entry.get('tooth_number', '—')}", styles["table_cell"]),
                Paragraph(_fmt_condition(entry.get("condition", "")), styles["table_cell"]),
                Paragraph(entry.get("treatment", "—"), styles["table_cell_muted"]),
                badge,
                Paragraph(entry.get("cdt_code") or "—", styles["table_cell_muted"]),
                Paragraph(entry.get("estimated_cost") or "—", styles["table_cell_muted"]),
            ])
        tbl = Table(rows, colWidths=col_widths, repeatRows=1)

    else:
        col_widths = [0.55*inch, 1.5*inch, 1.8*inch, 0.85*inch, 0.8*inch, 0.85*inch]
        header_row = [
            Paragraph("TOOTH", styles["table_header"]),
            Paragraph("CONDITION", styles["table_header"]),
            Paragraph("TREATMENT", styles["table_header"]),
            Paragraph("PRIORITY", styles["table_header"]),
            Paragraph("CDT", styles["table_header"]),
            Paragraph("EST. COST", styles["table_header"]),
        ]
        rows = [header_row]
        for p in protocols:
            urg   = p.urgency or "routine"
            color = _urg_color(urg)
            badge = Table([[Paragraph(urg.upper(), styles["badge"])]], colWidths=[0.7*inch])
            badge.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), color),
                ("TOPPADDING",    (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            rows.append([
                Paragraph(f"#{p.tooth_number}" if p.tooth_number else "—", styles["table_cell"]),
                Paragraph(_fmt_condition(p.condition), styles["table_cell"]),
                Paragraph(p.recommended_treatment or "—", styles["table_cell_muted"]),
                badge,
                Paragraph(p.cdt_code or "—", styles["table_cell_muted"]),
                Paragraph(p.estimated_cost or "—", styles["table_cell_muted"]),
            ])
        tbl = Table(rows, colWidths=col_widths, repeatRows=1)

    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), GRAY_LIGHT),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, GRAY_LIGHT]),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elems.append(tbl)

    # Evidence note if available
    tx_out = state.treatment_output
    if tx_out and tx_out.evidence_summary:
        elems.append(Spacer(1, 10))
        elems.append(Paragraph("Evidence Note", styles["section_title"]))
        elems += _section_rule(styles)
        elems.append(Paragraph(tx_out.evidence_summary, styles["body"]))
        if tx_out.success_rate:
            elems.append(Paragraph(f"<b>Success rate:</b> {tx_out.success_rate}", styles["body"]))
        if tx_out.alternatives:
            alts = " · ".join(tx_out.alternatives)
            elems.append(Paragraph(f"<b>Alternatives:</b> {alts}", styles["body"]))

    return elems


def _build_xray(state: PatientState, assets_root: Path, styles) -> list:
    elems = []

    img_artifact = state.imaging_artifact
    if not img_artifact or not img_artifact.image_id:
        return elems

    # Locate the image file
    xray_dir = assets_root / "xrays"
    img_path: Optional[Path] = None
    if xray_dir.exists():
        for p in xray_dir.iterdir():
            if p.stem == img_artifact.image_id:
                img_path = p
                break

    if not img_path or not img_path.exists():
        return elems

    elems += _section_heading("X-Ray Image", styles)

    # Caption
    img_type = (img_artifact.image_type or "panoramic").title()
    caption  = f"{img_type} radiograph — {img_artifact.image_id}"
    elems.append(Paragraph(caption, styles["meta_label"]))
    elems.append(Spacer(1, 4))

    # Embed image — max width 6.5 inches, preserve aspect ratio
    try:
        from PIL import Image as PILImage
        with PILImage.open(img_path) as pil_img:
            w_px, h_px = pil_img.size
        aspect    = h_px / w_px
        max_width = 6.5 * inch
        img_w     = max_width
        img_h     = max_width * aspect
        if img_h > 4.5 * inch:
            img_h = 4.5 * inch
            img_w = img_h / aspect
        elems.append(Image(str(img_path), width=img_w, height=img_h))
    except Exception:
        elems.append(Paragraph("(X-ray image could not be embedded)", styles["body"]))

    elems.append(Spacer(1, 6))

    # Findings legend
    if state.tooth_chart:
        legend_items = []
        for tn, f in sorted(state.tooth_chart.items()):
            sev = f.severity.lower()
            color_hex = {
                "severe": "#FF5C7A",
                "moderate": "#FF9F4A",
                "mild": "#F4C152",
            }.get(sev, "#a3a3a3")
            legend_items.append(
                f'<font color="{color_hex}">■</font> #{tn} — {_fmt_condition(f.condition)} ({sev})'
            )
        if legend_items:
            elems.append(Paragraph("Findings identified in this image:", styles["meta_label"]))
            elems.append(Spacer(1, 3))
            # Two columns
            mid = (len(legend_items) + 1) // 2
            col1 = legend_items[:mid]
            col2 = legend_items[mid:]
            max_rows = max(len(col1), len(col2))
            legend_rows = []
            for i in range(max_rows):
                c1 = Paragraph(col1[i] if i < len(col1) else "", styles["body"])
                c2 = Paragraph(col2[i] if i < len(col2) else "", styles["body"])
                legend_rows.append([c1, c2])
            legend_tbl = Table(legend_rows, colWidths=["50%", "50%"])
            legend_tbl.setStyle(TableStyle([
                ("VALIGN",        (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
                ("TOPPADDING",    (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            elems.append(legend_tbl)

    return elems


def _build_clinical_notes(state: PatientState, styles) -> list:
    elems = []

    notes = None
    if state.clinical_notes_artifact and state.clinical_notes_artifact.notes_text:
        notes = state.clinical_notes_artifact.notes_text

    if not notes:
        return elems

    elems += _section_heading("Clinical Notes", styles)
    # Render as preformatted mono text, splitting on newlines
    for line in notes.splitlines():
        stripped = line.strip()
        if stripped == "":
            elems.append(Spacer(1, 4))
        else:
            safe = stripped.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            elems.append(Paragraph(safe, styles["mono"]))

    return elems


def _footer(canvas, doc):
    canvas.saveState()
    page_w, _ = LETTER
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GRAY_MID)
    canvas.drawCentredString(
        page_w / 2,
        0.5 * inch,
        f"Tooth Fairy Dental AI  ·  Confidential  ·  Page {doc.page}",
    )
    canvas.restoreState()


# ── Public API ────────────────────────────────────────────────────────────────

def generate_report(
    state: PatientState,
    profile: Optional[dict] = None,
    assets_root: Optional[Path] = None,
) -> bytes:
    """Generate a PDF report for the given session. Returns raw PDF bytes."""

    if assets_root is None:
        from app.core.config import settings
        assets_root = settings.ASSETS_ROOT_DIR

    buf    = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.85 * inch,
        title=f"Dental Report — {state.identifiers.patient_id}",
        author="Tooth Fairy Dental AI",
    )

    story = []
    story += _build_cover(state, profile, styles)
    story += _build_xray(state, assets_root, styles)
    story += _build_findings(state, styles)
    story += _build_treatment(state, styles)
    story += _build_clinical_notes(state, styles)

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()
