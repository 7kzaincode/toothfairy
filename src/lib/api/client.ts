/**
 * API Client
 * TODO: Implement fetch wrappers for each endpoint
 */

import { ENDPOINTS } from "./endpoints";
import type {
  ImagingActionRequest,
  ImagingActionResponse,
  ClinicalNotesActionRequest,
  ClinicalNotesActionResponse,
  ClinicalNotesChatRequest,
  ClinicalNotesChatResponse,
  TreatmentActionRequest,
  TreatmentActionResponse,
  ImageUploadResponse,
  ImageListResponse,
  SessionResponse,
  AutoScanResponse,
} from "@/types/api";
import type { PatientState } from "@/types/patient-state";

export class APIClient {
  // Session
  async createSession(): Promise<SessionResponse> {
    const response = await fetch(ENDPOINTS.SESSION_CREATE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json() as Promise<SessionResponse>;
  }

  async getSessionState(sessionId: string): Promise<PatientState> {
    const response = await fetch(ENDPOINTS.SESSION_STATE(sessionId), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session state: ${response.statusText}`);
    }

    return response.json() as Promise<PatientState>;
  }

  // Imaging
  async uploadImage(file: File): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(ENDPOINTS.IMAGING_UPLOAD, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    return response.json() as Promise<ImageUploadResponse>;
  }

  async triggerImagingAction(req: ImagingActionRequest): Promise<ImagingActionResponse> {
    const response = await fetch(ENDPOINTS.IMAGING_ACTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger imaging action: ${response.statusText}`);
    }

    return response.json() as Promise<ImagingActionResponse>;
  }

  async listImages(): Promise<ImageListResponse> {
    const response = await fetch(ENDPOINTS.IMAGING_IMAGES, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list images: ${response.statusText}`);
    }

    return response.json() as Promise<ImageListResponse>;
  }

  async triggerAutoScan(
    sessionId: string,
    imageId: string,
    imageType: string = "panoramic"
  ): Promise<AutoScanResponse> {
    const response = await fetch(ENDPOINTS.IMAGING_AUTO_SCAN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        image_id: imageId,
        image_type: imageType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger auto-scan: ${response.statusText}`);
    }

    return response.json() as Promise<AutoScanResponse>;
  }

  // Clinical Notes
  async triggerClinicalNotesAction(req: ClinicalNotesActionRequest): Promise<ClinicalNotesActionResponse> {
    const response = await fetch(ENDPOINTS.CLINICAL_NOTES_ACTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger clinical notes action: ${response.statusText}`);
    }

    return response.json() as Promise<ClinicalNotesActionResponse>;
  }

  async chatClinicalNotes(req: ClinicalNotesChatRequest): Promise<ClinicalNotesChatResponse> {
    const response = await fetch(ENDPOINTS.CLINICAL_NOTES_CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`Failed to chat clinical notes: ${response.statusText}`);
    }

    return response.json() as Promise<ClinicalNotesChatResponse>;
  }

  // Treatment
  async triggerTreatmentAction(req: TreatmentActionRequest): Promise<TreatmentActionResponse> {
    const response = await fetch(ENDPOINTS.TREATMENT_ACTION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger treatment action: ${response.statusText}`);
    }

    return response.json() as Promise<TreatmentActionResponse>;
  }
}

export const apiClient = new APIClient();
