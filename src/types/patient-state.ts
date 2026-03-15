/**
 * Patient State Types
 * Mirrors backend/app/models/patient_state.py
 */

export interface SessionIdentifiers {
  session_id: string;
  case_id: string;
  patient_id: string;
}

export interface ToothFinding {
  tooth_number: number; // FDI numbering (11-48)
  condition: string;
  severity: string;
  confidence: number;
  location_description: string;
}

export interface TreatmentProtocol {
  condition: string;
  tooth_number: number;
  recommended_treatment: string;
  urgency: string;
  estimated_visits: number;
  patient_explanation: string;
  cdt_code?: string;
  estimated_cost?: string;
}

export interface ImagingArtifact {
  image_id: string;
  image_type: string;
  image_url: string;
  width: number;
  height: number;
}

export interface ImagingOutput {
  segmentation_mask_url?: string;
  contour_points?: number[][];
  findings: ToothFinding[];
  narrative_summary?: string;
}

export interface ImagingProvenance {
  segmentation_source: string;
  findings_source: string;
  fallback_used: boolean;
  duration_ms: number;
}

export interface ClinicalNotesArtifact {
  notes_text: string;
  source: string;
}

export interface ClinicalNotesOutput {
  diagnoses: ToothFinding[];
  protocols: TreatmentProtocol[];
  timeline: TimelineEntry[];
  patient_summary?: string;
  dentist_summary?: string;
}

export interface ClinicalNotesProvenance {
  extraction_source: string;
  protocol_source: string;
  fallback_used: boolean;
  duration_ms: number;
}

export interface TreatmentOutput {
  evidence_summary?: string;
  success_rate?: string;
  risk_factors?: string[];
  alternatives?: string[];
  referral_summary?: string;
  patient_education?: string;
}

export interface TreatmentProvenance {
  fallback_used: boolean;
  duration_ms: number;
}

export interface TimelineEntry {
  order: number;
  tooth_number: number;
  condition: string;
  treatment: string;
  urgency: string;
  urgency_color: string;
  estimated_visits: number;
  cdt_code?: string;
  estimated_cost?: string;
}

export interface PatientState {
  identifiers: SessionIdentifiers;
  imaging_artifact?: ImagingArtifact;
  imaging_output?: ImagingOutput;
  imaging_provenance?: ImagingProvenance;
  clinical_notes_artifact?: ClinicalNotesArtifact;
  clinical_notes_output?: ClinicalNotesOutput;
  clinical_notes_provenance?: ClinicalNotesProvenance;
  treatment_output?: TreatmentOutput;
  treatment_provenance?: TreatmentProvenance;
  tooth_chart: Record<number, ToothFinding>;
  created_at: string;
  last_updated_at: string;
  action_count: number;
}
