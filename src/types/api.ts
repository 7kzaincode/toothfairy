/**
 * API Request/Response Types
 * Mirrors backend request/response models
 */

// Imaging
export interface ImagingActionRequest {
  session_id: string;
  image_id: string;
  x: number;
  y: number;
  image_type?: string;
}

export interface ImagingActionResponse {
  session_id: string;
  image_id: string;
  tooth_number: number;
  segmentation_mask_url?: string;
  contour_points?: number[][];
  findings: Array<{
    tooth_number: number;
    condition: string;
    severity: string;
    confidence: number;
    location_description: string;
  }>;
  narrative?: string;
  narrative_summary?: string;
  provenance: string;
  inference_time_ms: number;
}

export interface ImageUploadResponse {
  image_id: string;
  filename: string;
  image_url: string;
  width: number;
  height: number;
}

export interface ImageListResponse {
  images: ImageUploadResponse[];
}

export interface AutoScanRequest {
  session_id: string;
  image_id: string;
  image_type?: string;
}

export interface AutoScanResponse {
  total_teeth: number;
  segmented: number;
  suspicious_teeth: number;
  findings: Array<{
    tooth_number: number;
    condition: string;
    severity: string;
    confidence: number;
    location_description: string;
  }>;
  inference_time_ms: number;
  segments: Array<{
    tooth_number: number;
    contour_points: number[][];
    confidence: number;
  }>;
  provenance: string;
}

// Clinical Notes
export interface ClinicalNotesActionRequest {
  session_id: string;
  highlighted_text: string;
  full_notes?: string;
}

export interface ClinicalNotesActionResponse {
  session_id: string;
  diagnoses: Array<{
    tooth_number: number;
    condition: string;
    severity: string;
    confidence: number;
    location_description: string;
  }>;
  treatment_protocols: Array<{
    condition: string;
    tooth_number: number;
    recommended_treatment: string;
    urgency: string;
    estimated_visits: number;
    patient_explanation: string;
    cdt_code?: string;
    estimated_cost?: string;
  }>;
  treatment_timeline: Array<{
    order: number;
    tooth_number: number;
    condition: string;
    treatment: string;
    urgency: string;
    urgency_color: string;
    estimated_visits: number;
    cdt_code?: string;
    estimated_cost?: string;
  }>;
  patient_summary?: string;
  dentist_summary?: string;
  provenance: string;
  inference_time_ms?: number;
}

export interface ClinicalNotesChatRequest {
  session_id: string;
  message: string;
  context?: string;
}

export interface ClinicalNotesChatResponse {
  session_id: string;
  response: string;
  sources?: string[];
}

// Treatment
export interface TreatmentActionRequest {
  session_id: string;
  condition: string;
  tooth_number?: number;
}

export interface TreatmentActionResponse {
  session_id: string;
  condition: string;
  evidence_summary?: string;
  success_rate?: string;
  risk_factors?: string[];
  alternatives?: string[];
  referral_summary?: string;
  patient_education?: string;
  provenance: string;
  inference_time_ms: number;
}

// Session
export interface SessionResponse {
  session_id: string;
  case_id: string;
  patient_id: string;
  created_at: string;
}
