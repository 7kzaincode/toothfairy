/**
 * API Endpoint Constants
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const ENDPOINTS = {
  // Session
  SESSION_CREATE: `${BASE}/api/session`,
  SESSION_LIST: `${BASE}/api/session`,
  SESSION_GET: (id: string) => `${BASE}/api/session/${id}`,
  SESSION_STATE: (id: string) => `${BASE}/api/session/${id}/state`,
  SESSION_DELETE: (id: string) => `${BASE}/api/session/${id}`,

  // Imaging
  IMAGING_ACTION: `${BASE}/api/imaging/action`,
  IMAGING_UPLOAD: `${BASE}/api/imaging/upload`,
  IMAGING_IMAGE: (id: string) => `${BASE}/api/imaging/image/${id}`,
  IMAGING_IMAGES: `${BASE}/api/imaging/images`,

  // Clinical Notes
  CLINICAL_NOTES_ACTION: `${BASE}/api/clinical-notes/action`,
  CLINICAL_NOTES_CHAT: `${BASE}/api/clinical-notes/chat`,

  // Treatment
  TREATMENT_ACTION: `${BASE}/api/treatment/action`,

  // SSE
  STREAM: (sessionId: string) => `${BASE}/api/stream/${sessionId}`,

  // Health
  HEALTH: `${BASE}/health`,
} as const;
