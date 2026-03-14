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
} from "@/types/api";
import type { PatientState } from "@/types/patient-state";

export class APIClient {
  // Session
  async createSession(): Promise<SessionResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  async getSessionState(sessionId: string): Promise<PatientState> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  // Imaging
  async uploadImage(file: File): Promise<ImageUploadResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  async triggerImagingAction(req: ImagingActionRequest): Promise<ImagingActionResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  async listImages(): Promise<ImageListResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  // Clinical Notes
  async triggerClinicalNotesAction(req: ClinicalNotesActionRequest): Promise<ClinicalNotesActionResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  async chatClinicalNotes(req: ClinicalNotesChatRequest): Promise<ClinicalNotesChatResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }

  // Treatment
  async triggerTreatmentAction(req: TreatmentActionRequest): Promise<TreatmentActionResponse> {
    // TODO: implement
    throw new Error("Not implemented");
  }
}

export const apiClient = new APIClient();
