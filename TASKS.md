# Tooth Fairy — Task Board

## Branch Structure

```
main
├── frontend
│   ├── frontend/wiring          → hooks, API client, SSE, page.tsx integration
│   ├── frontend/tooth-chart     → interactive SVG dental chart (THE differentiator)
│   ├── frontend/xray-viewer     → X-ray display, segmentation overlay, findings
│   ├── frontend/notes-viewer    → clinical notes split view, text highlight, timeline
│   └── frontend/polish          → demo data embedded in UI, final visual pass
├── backend
    ├── backend/clinical-notes   → Gemini extraction, protocol mapper, timeline gen
    ├── backend/imaging          → MedSAM2 handler, tooth mapper, finding detector
    ├── backend/demo-cache       → cached segmentations, findings, evidence JSONs
    └── backend/treatment        → evidence lookup, referral gen (stretch goal)
```

---

## BACKEND BRANCH

Base branch: `backend`
Start here: `cd backend && pip install -r requirements.txt && cp .env.example .env`
Run with: `uvicorn app.main:app --reload`

---

### `backend/clinical-notes` — Priority 1

The highest-value copilot for the demo. Regex extractor is already wired in `extractor.py` and `protocol_mapper.py` — the main gap is Gemini LLM integration and getting the full pipeline talking end-to-end.

**Tasks (highest → lowest):**

- [ ] **[P0] Wire Gemini into `extractor.py`**
  Replace the current regex-only path with a Gemini structured output call. Prompt should return `[{tooth_number, condition, severity, confidence, location_description}]` as JSON. Keep regex as fallback if `GOOGLE_API_KEY` is unset or call fails. File: `backend/app/copilots/clinical_notes/extractor.py`

- [ ] **[P0] Implement `llm_client.py` — `parse_clinical_notes()`**
  Use `google-generativeai` SDK. Model: `gemini-2.0-flash`. System prompt: dental clinician extracting structured diagnoses. Return raw JSON string, caller parses. File: `backend/app/services/llm_client.py`

- [ ] **[P1] Add `evidence_lookup.py` to treatment copilot**
  New file `backend/app/copilots/treatment/evidence_lookup.py`. Load from `assets/cache/treatment/evidence/{condition}.json` via `CacheManager.get_treatment_evidence()`. If not found, call Gemini with a concise evidence prompt. Return dict with `summary`, `success_rate`, `risk_factors`, `alternatives`.

- [ ] **[P1] Implement clinical notes chat endpoint**
  Currently returns placeholder string. Wire in Gemini `chat()` method. Include the session's `patient_state` as context in the system prompt. File: `backend/app/api/routes/clinical_notes.py` — `clinical_notes_chat()`

- [ ] **[P2] Validate protocol mapper covers all conditions**
  Cross-check `PROTOCOL_MAP` keys in `protocol_mapper.py` against every condition the extractor can produce. Add missing entries: `abscess`, `crown_defect`, `missing`, `root_resorption`. File: `backend/app/copilots/clinical_notes/protocol_mapper.py`

- [ ] **[P2] Add CDT code and cost to timeline entries**
  `generate_timeline()` already includes these fields but they're only populated if the protocol has them. Audit that all `TreatmentProtocol` objects from `protocol_mapper.py` carry `cdt_code` and `estimated_cost`. File: `backend/app/copilots/clinical_notes/timeline_generator.py`

---

### `backend/imaging` — Priority 2

Core copilot. The handler, tooth mapper, and cache fallback are already scaffolded. Gap is Gemini vision and the MedSAM2 client.

**Tasks (highest → lowest):**

- [ ] **[P0] Implement `finding_detector.py` — Gemini vision**
  `detect_findings_with_llm()` currently returns `[]`. Implement: encode image region as base64, call Gemini with vision prompt asking for dental findings in the region. Return list of `ToothFinding`. Prompt should be specific: "You are a dental radiologist. List all pathological findings visible in this cropped X-ray region." File: `backend/app/copilots/imaging/finding_detector.py`

- [ ] **[P0] Implement `llm_client.py` — `extract_dental_findings()`**
  Accepts `image_bytes: bytes` and `prompt: str`. Encodes to base64, sends as `image/jpeg` part to Gemini vision. Returns dict. File: `backend/app/services/llm_client.py`

- [ ] **[P1] Implement `replicate_client.py` — `segment_tooth()`**
  Call the Modal/Replicate endpoint defined in `MODAL_ENDPOINT_URL`. POST with `{image_url, point_x, point_y}`. Parse response into `{contour_points: [[x,y]...]}`. Wrap in try/except — handler already falls back to bounding box estimate if this raises. File: `backend/app/services/replicate_client.py`

- [ ] **[P1] Wire `ReliabilityManager` into imaging handler**
  `handler.py` currently calls the cache directly. Replace the segmentation block with `reliability_manager.execute_with_fallback(live_fn=replicate_client.segment_tooth, fallback_value=bounding_box_estimate, timeout_seconds=settings.IMAGING_INFERENCE_TIMEOUT_SECONDS)`. Set provenance accordingly. File: `backend/app/copilots/imaging/handler.py`

- [ ] **[P2] Improve `tooth_mapper.py` accuracy for lower jaw**
  Current panoramic mapping splits upper/lower at `norm_y < 0.5`. Real panoramic X-rays have the upper arch from ~20-45% height and lower from ~55-80%. Update `_map_panoramic()` thresholds and verify against the demo X-ray dimensions. File: `backend/app/copilots/imaging/tooth_mapper.py`

- [ ] **[P2] Return `image_url` in `ImagingActionResponse`**
  Frontend needs to know the URL to display the image. Add `image_url` field to `ImagingActionResponse` model and populate it in handler using `ENDPOINTS.IMAGING_IMAGE(image_id)`. Files: `backend/app/models/imaging.py`, `backend/app/copilots/imaging/handler.py`

---

### `backend/demo-cache` — Priority 3

Makes the entire app demoable without live APIs. `DEMO_MODE=true` in `.env` should make all copilots return rich cached responses.

**Tasks (highest → lowest):**

- [ ] **[P0] Create `assets/cache/imaging/patient-001/demo-panoramic/findings.json`**
  JSON structure: `{"teeth": {"36": {"findings": [{"condition": "periapical_lesion", "severity": "moderate", "confidence": 0.92, "location": "periapical region"}]}, "14": {...}, "47": {...}, "28": {...}}}`. This is what `CacheManager.get_imaging_findings()` reads.

- [ ] **[P0] Create `assets/cache/imaging/patient-001/demo-panoramic/segmentation_tooth_36.json`**
  JSON: `{"contour_points": [[x,y], [x,y], ...]}` — a realistic ellipse around where tooth #36 would be on a panoramic. Also create for teeth #14, #47, #28.

- [ ] **[P0] Create `assets/cache/clinical_notes/mappings/condition_to_treatment.json`**
  Top-level: `{"mappings": {"cavity": {...}, "periapical_lesion": {...}, "bone_loss": {...}, "impacted": {...}, ...}}`. Each entry mirrors the structure already defined in `PROTOCOL_MAP` in `protocol_mapper.py` — this is the file-based version.

- [ ] **[P1] Create `assets/cache/treatment/evidence/` JSONs**
  One file per condition: `periapical_lesion.json`, `cavity.json`, `bone_loss.json`, `impacted.json`. Each: `{"summary": "...", "success_rate": 0.94, "risk_factors": [...], "alternatives": [...], "referral_summary": "...", "patient_education": "..."}`.

- [ ] **[P1] Add a demo panoramic X-ray to `assets/xrays/`**
  Source a public-domain dental panoramic PNG (Wikimedia Commons has several). Name it `demo-panoramic.png`. This is what gets served at `/api/imaging/image/demo-panoramic`.

- [ ] **[P2] Add `DEMO_MODE` short-circuit to imaging handler**
  If `settings.DEMO_MODE` is true, skip the Replicate call entirely and go straight to cache lookup. Already partially handled but add an explicit early-return path with a `log_emitter.emit_info(... "Demo mode: using cached segmentation")` message. File: `backend/app/copilots/imaging/handler.py`

---

### `backend/treatment` — Priority 4 (stretch goal)

**Tasks (highest → lowest):**

- [ ] **[P1] Implement `evidence_lookup.py`**
  New file. `async def lookup_evidence(condition: str, cache_manager: CacheManager) -> dict`. Try cache first. On miss, call `llm_client.chat()` with a structured evidence prompt. Return normalized dict.

- [ ] **[P2] Wire treatment handler to use `evidence_lookup.py`**
  Replace the current placeholder logic in `handler.py` with a call to `lookup_evidence()`. Wrap in `reliability_manager.execute_with_fallback()`. File: `backend/app/copilots/treatment/handler.py`

- [ ] **[P3] Add referral generation**
  If `severity == "severe"`, Gemini generates a specialist referral note. Add `generate_referral_note(condition, tooth_number, severity)` to `evidence_lookup.py`. Append to response.

---

## FRONTEND BRANCH

Base branch: `frontend`
Run with: `npm run dev`
API base set via `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`

---

### `frontend/wiring` — Priority 1

Everything else in frontend depends on this. Hooks and API client must be real before any viewer can talk to the backend.

**Tasks (highest → lowest):**

- [ ] **[P0] Implement `usePatientState.ts`**
  `createSession()`: POST `/api/session`, store `session_id` in state. `refreshState()`: GET `/api/session/{id}/state`, update `patientState`. Export `{ sessionId, patientState, loading, createSession, refreshState }`. Call `createSession()` on mount in `page.tsx`. File: `src/hooks/usePatientState.ts`

- [ ] **[P0] Implement `useSSE.ts`**
  Create `EventSource` pointed at `/api/stream/{sessionId}` when `sessionId` is set. On `message` event parse JSON as `LogEvent` and append to `logs` array (cap at 200 entries). On `heartbeat` event ignore. Cleanup `EventSource` on unmount or when `sessionId` changes. File: `src/hooks/useSSE.ts`

- [ ] **[P0] Implement `APIClient` in `client.ts`**
  All 8 methods. Use `fetch`. `createSession()`, `getSessionState()`, `uploadImage()` (multipart), `triggerImagingAction()`, `triggerClinicalNotesAction()`, `chatClinicalNotes()`, `listImages()`, `triggerTreatmentAction()`. Throw on non-2xx. File: `src/lib/api/client.ts`

- [ ] **[P0] Implement `SSEClient` in `sse/client.ts`**
  `connect(sessionId, onEvent)`: creates `EventSource`, registers `log` and `heartbeat` listeners, calls `onEvent` for each log. `disconnect()`: closes and nulls `eventSource`. File: `src/lib/sse/client.ts`

- [ ] **[P0] Implement `useCopilot.ts`**
  `triggerImaging(imageId, x, y)`: calls `apiClient.triggerImagingAction()`, then `refreshState()`. `triggerClinicalNotes(text, fullNotes?)`: calls `apiClient.triggerClinicalNotesAction()`, then `refreshState()`. `triggerTreatment(condition, toothNumber?)`: calls `apiClient.triggerTreatmentAction()`, then `refreshState()`. Each sets `activeCopilot` and `processing` flags. File: `src/hooks/useCopilot.ts`

- [ ] **[P1] Wire `page.tsx` to real hooks**
  Replace `DEMO_STATE` and `DEMO_LOGS` with `usePatientState()`, `useSSE()`, `useCopilot()`. Pass `triggerImaging` down to `CenterPane` → `DentalXrayViewer`. Pass `triggerClinicalNotes` down to `ClinicalNotesViewer`. Call `createSession()` in a `useEffect` on mount. File: `src/app/page.tsx`

- [ ] **[P2] Add image upload handler in `LeftPane.tsx`**
  Hidden `<input type="file" accept="image/*">` triggered by an "Upload X-Ray" button. On change: call `apiClient.uploadImage(file)`, store returned `image_id` in local state, call `onSelectArtifact("imaging")` to switch to the X-ray tab. File: `src/components/layout/LeftPane.tsx`

---

### `frontend/tooth-chart` — Priority 2

The single biggest visual differentiator. Must be in both LeftPane (mini) and CenterPane (full).

**Tasks (highest → lowest):**

- [ ] **[P0] Define `tooth-paths.ts` — SVG data for all 32 teeth**
  Each entry: `{ toothNumber, path, x, y, label }`. Use simplified tooth silhouettes (molar = wider rectangle with cusps, premolar = narrower, incisor/canine = rounded). Define a `viewBox` of `600 x 280` for the full chart. Upper arch teeth 18→11→21→28 left-to-right, lower arch 48→41→31→38 left-to-right. File: `src/components/viewers/tooth-paths.ts`

- [ ] **[P0] Implement `ToothPath.tsx` — individual tooth SVG**
  Render the path from `tooth-paths.ts`. Fill color: prop `color` (default `#1A2232`). On hover: lighten border to `--ide-accent`. On click: call `onClick(toothNumber)`. Show tooth number label below. Apply `isSelected` ring with `--ide-accent` stroke. File: `src/components/viewers/ToothPath.tsx`

- [ ] **[P0] Implement `ToothChart.tsx` — full interactive SVG**
  SVG `viewBox="0 0 600 280"`. Map `TOOTH_PATHS` entries to `<ToothPath>` components. Color each tooth by condition from `toothChart` prop using the color map: cavity→`#F4C152`, periapical→`#FF5C7A`, bone_loss→`#A78BFA`, impacted→`#4C9AFF`, missing→`#6E7A92`. Midline separator. Arch labels (R/L). `mini` prop: scale down to fit `LeftPane` width (~220px), hide labels. File: `src/components/viewers/ToothChart.tsx`

- [ ] **[P1] Add `ToothChart` to `LeftPane.tsx`**
  Replace the current findings list section with the mini `<ToothChart>` component. Keep the findings list below it. Pass `toothChart` from `patientState`. On `onToothClick`, call `onSelectArtifact("imaging")` and store the selected tooth number. File: `src/components/layout/LeftPane.tsx`

- [ ] **[P1] Add `tooth-chart` tab to `CenterPane.tsx`**
  The tab already exists in `TABS`. Replace `ToothChartPlaceholder` with the real `<ToothChart>` component (full size, `mini={false}`). Pass `onToothClick` that could trigger the imaging copilot. File: `src/components/layout/CenterPane.tsx`

- [ ] **[P2] Animate tooth color changes**
  When a tooth's condition changes (new finding arrives), briefly pulse it using `animate-pulse-subtle` from `globals.css`. Track previous `toothChart` state with a `useRef` and apply the animation class for 2 seconds on changed teeth. File: `src/components/viewers/ToothChart.tsx`

---

### `frontend/xray-viewer` — Priority 3

**Tasks (highest → lowest):**

- [ ] **[P0] Implement `DentalXrayViewer.tsx` — image display + click**
  `<div>` containing `<img src={imageUrl}>` with `position: relative`. `onClick` handler: check `e.metaKey` (Cmd on Mac) or `e.ctrlKey`. Calculate `x, y` relative to image bounds via `e.currentTarget.getBoundingClientRect()`. Call `onToothClick(imageId, x, y)`. Show cursor crosshair on hover. File: `src/components/viewers/DentalXrayViewer.tsx`

- [ ] **[P0] Implement `SegmentationOverlay.tsx` — SVG contour**
  Render an SVG `<polygon>` from `contourPoints: number[][]`. Position absolute over the image. Fill: `rgba(43, 212, 167, 0.15)` (success green). Stroke: `#2BD4A7`, width 2. Animate in with a short fade. File: `src/components/viewers/SegmentationOverlay.tsx`

- [ ] **[P0] Implement `FindingsPanel.tsx` — finding cards**
  One card per `ToothFinding`. Card includes: tooth number badge, condition name, severity chip (color-coded: mild→yellow, moderate→orange, severe→red), confidence bar (thin progress bar), location description. `animate-slide-in` on mount. File: `src/components/viewers/FindingsPanel.tsx`

- [ ] **[P1] Add zoom/pan to `DentalXrayViewer.tsx`**
  CSS `transform: scale(zoom) translate(panX, panY)`. Mouse wheel → zoom. Middle-click drag or Alt+drag → pan. Zoom range 1→4×. Reset button in top-right corner.

- [ ] **[P1] Add brightness/contrast controls to `DentalXrayViewer.tsx`**
  Two range sliders in a small toolbar (brightness 50-200%, contrast 50-200%). Apply via CSS `filter: brightness(b) contrast(c)` on the `<img>`. Defaults: 100/100.

- [ ] **[P1] Wire `DentalXrayViewer` into `CenterPane.tsx`**
  Pass down `imageUrl` (from `patientState.imaging_artifact`), `imageId`, `onToothClick` (from `useCopilot`), and `segmentationOverlay` (from `patientState.imaging_output?.contour_points`). Render `<FindingsPanel>` below the image or in a side column. File: `src/components/layout/CenterPane.tsx`

- [ ] **[P2] Show loading spinner during imaging inference**
  When `activeCopilot === "imaging"` and `processing === true`, overlay a semi-transparent spinner on the X-ray image. Use `animate-pulse-subtle`. Add a "Analyzing tooth #XX..." caption from the latest log message. File: `src/components/viewers/DentalXrayViewer.tsx`

---

### `frontend/notes-viewer` — Priority 4

**Tasks (highest → lowest):**

- [ ] **[P0] Implement `NotesHighlighter.tsx` — text selection trigger**
  Render text in a `<pre>` or `<div contentEditable={false}>`. Listen to `mouseup` and `touchend`. On event: call `window.getSelection()`, check `toString().trim().length > 10`. If yes, show a floating "Analyze" button near the selection (position via `getBoundingClientRect()` of the range). On button click: call `onHighlight(selectedText)`. File: `src/components/viewers/NotesHighlighter.tsx`

- [ ] **[P0] Implement `TreatmentTimeline.tsx` — urgency visual**
  Vertical timeline. Each entry has a left-side colored bar (immediate=`#FF5C7A`, soon=`#F4C152`, routine=`#2BD4A7`, monitor=`#4C9AFF`). Entry card shows: tooth #, condition, recommended treatment, CDT code, cost, visit count. Entries sorted by urgency order already from backend. `animate-slide-in` staggered by index (50ms delay per item). File: `src/components/viewers/TreatmentTimeline.tsx`

- [ ] **[P0] Implement `ClinicalNotesViewer.tsx` — split view**
  Left 60%: `<NotesHighlighter>` with the notes text. Right 40%: `<TreatmentTimeline>` when `output` is present, else a "Highlight text to analyze" empty state. Both sides scroll independently. Pass `onHighlight` down to `NotesHighlighter`, which calls `triggerClinicalNotes` from `useCopilot`. File: `src/components/viewers/ClinicalNotesViewer.tsx`

- [ ] **[P1] Wire `ClinicalNotesViewer` into `CenterPane.tsx`**
  Replace `ClinicalNotesPlaceholder` with the real component. Pass `notesText` (hardcoded demo or from state), `output` from `patientState.clinical_notes_output`, and `onTextHighlight` from `useCopilot.triggerClinicalNotes`. File: `src/components/layout/CenterPane.tsx`

- [ ] **[P1] Show patient summary and dentist summary tabs**
  Below the timeline in the right panel, add two tabs: "Patient View" and "Dentist View". Patient view shows `output.patient_summary` in larger readable text. Dentist view shows `output.dentist_summary` in monospace with CDT codes. File: `src/components/viewers/ClinicalNotesViewer.tsx`

- [ ] **[P2] Highlight extracted teeth in notes text**
  After analysis, re-render the notes with `#14`, `#36`, etc. wrapped in `<mark>` spans colored by their condition. Build a replace pass over the text using the `diagnoses` from the copilot response. File: `src/components/viewers/NotesHighlighter.tsx`

---

### `frontend/polish` — Priority 5

**Tasks (highest → lowest):**

- [ ] **[P1] Embed demo clinical notes in `ClinicalNotesViewer.tsx`**
  The demo notes for Sarah Chen are already written in `CenterPane.tsx`. Move them to a `DEMO_NOTES` constant exported from `src/lib/demo-data.ts`. Import in `ClinicalNotesViewer` and use as the default `notesText` prop when none is provided.

- [ ] **[P1] Add session init screen**
  On first load (before `sessionId` is set), show a centered card: "Tooth Fairy" logo, "Start Session" button. On click, call `createSession()` and show a loading spinner. Transition to full IDE once session is created. File: `src/app/page.tsx`

- [ ] **[P2] Add RightPane "Clear Logs" button**
  Small button in the terminal header. Calls `clearLogs()` from `useSSE`. Also add a "Copy" button that copies all log messages as plain text to clipboard. File: `src/components/layout/RightPane.tsx`

- [ ] **[P2] Add `TreatmentTable.tsx` (stretch)**
  Table with columns: Tooth, Condition, Recommended Treatment, Urgency, CDT Code, Est. Cost. Rows are `TreatmentProtocol[]` from `patientState.clinical_notes_output?.protocols`. Click a row → calls `triggerTreatment(condition, toothNumber)` to fetch evidence. File: `src/components/viewers/TreatmentTable.tsx`

- [ ] **[P3] Responsive title bar**
  Add a thin top bar (32px) above the 3 panes with: "🦷 Tooth Fairy" name/logo on the left, patient name in the center, session ID + action count on the right. File: `src/app/page.tsx`

- [ ] **[P3] Keyboard shortcuts**
  `Cmd+1/2/3/4`: switch center pane tabs. `Cmd+U`: open file picker for X-ray upload. `Escape`: deselect/close any popover. Add a small `?` icon in the bottom-right that shows a shortcuts modal. File: `src/app/page.tsx`

---

## Quick Reference — File → Branch Mapping

| File | Branch |
|---|---|
| `backend/app/services/llm_client.py` | `backend/clinical-notes` |
| `backend/app/services/replicate_client.py` | `backend/imaging` |
| `backend/app/copilots/clinical_notes/extractor.py` | `backend/clinical-notes` |
| `backend/app/copilots/clinical_notes/protocol_mapper.py` | `backend/clinical-notes` |
| `backend/app/copilots/imaging/finding_detector.py` | `backend/imaging` |
| `backend/app/copilots/imaging/handler.py` | `backend/imaging` |
| `backend/app/copilots/imaging/tooth_mapper.py` | `backend/imaging` |
| `backend/app/copilots/treatment/handler.py` | `backend/treatment` |
| `assets/cache/**` | `backend/demo-cache` |
| `src/hooks/usePatientState.ts` | `frontend/wiring` |
| `src/hooks/useSSE.ts` | `frontend/wiring` |
| `src/hooks/useCopilot.ts` | `frontend/wiring` |
| `src/lib/api/client.ts` | `frontend/wiring` |
| `src/lib/sse/client.ts` | `frontend/wiring` |
| `src/app/page.tsx` | `frontend/wiring` |
| `src/components/viewers/tooth-paths.ts` | `frontend/tooth-chart` |
| `src/components/viewers/ToothPath.tsx` | `frontend/tooth-chart` |
| `src/components/viewers/ToothChart.tsx` | `frontend/tooth-chart` |
| `src/components/viewers/DentalXrayViewer.tsx` | `frontend/xray-viewer` |
| `src/components/viewers/SegmentationOverlay.tsx` | `frontend/xray-viewer` |
| `src/components/viewers/FindingsPanel.tsx` | `frontend/xray-viewer` |
| `src/components/viewers/NotesHighlighter.tsx` | `frontend/notes-viewer` |
| `src/components/viewers/TreatmentTimeline.tsx` | `frontend/notes-viewer` |
| `src/components/viewers/ClinicalNotesViewer.tsx` | `frontend/notes-viewer` |
| `src/components/viewers/TreatmentTable.tsx` | `frontend/polish` |
