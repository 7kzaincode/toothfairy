# Dental Tooth Segmentation Pipeline

## Technical Deep Dive: U-Net Semantic Segmentation + Connected Component Analysis

ToothFairy implements a real-time dental X-ray analysis pipeline that segments individual teeth from panoramic radiographs, extracts per-tooth contours, and routes findings into clinical workflows. This document covers every layer of the system — from the deep learning model architecture through post-processing, rendering, and clinical integration.

---

## Table of Contents

1. [Model Architecture](#1-model-architecture)
2. [Training Data & Weights](#2-training-data--weights)
3. [Inference Pipeline](#3-inference-pipeline)
4. [CCA Post-Processing](#4-cca-post-processing)
5. [Contour Extraction](#5-contour-extraction)
6. [Frontend Rendering](#6-frontend-rendering)
7. [Diagnostic Analysis (Gemini Vision)](#7-diagnostic-analysis-gemini-vision)
8. [Clinical Integration Pipeline](#8-clinical-integration-pipeline)
9. [Performance & Caching](#9-performance--caching)
10. [Architecture Diagram](#10-architecture-diagram)

---

## 1. Model Architecture

We use a **U-Net** encoder-decoder architecture for binary semantic segmentation of teeth in panoramic dental X-rays. The model is adapted from the open-source implementation by [SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image](https://github.com/SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image-Using-U-Net).

### Network Structure

| Component | Layers | Filters | Dropout |
|-----------|--------|---------|---------|
| Encoder Block 1 | Conv2D(3x3) → Dropout → Conv2D(3x3) → BatchNorm → MaxPool(2x2) | 32 | 0.1 |
| Encoder Block 2 | Conv2D(3x3) → Dropout → Conv2D(3x3) → BatchNorm → MaxPool(2x2) | 64 | 0.2 |
| Encoder Block 3 | Conv2D(3x3) → Dropout → Conv2D(3x3) → BatchNorm → MaxPool(2x2) | 128 | 0.3 |
| Encoder Block 4 | Conv2D(3x3) → Dropout → Conv2D(3x3) → BatchNorm → MaxPool(2x2) | 256 | 0.4 |
| **Bottleneck** | Conv2D(3x3) → Dropout → Conv2D(3x3) → BatchNorm | 512 | 0.5 |
| Decoder Block 1 | Conv2DTranspose(4x4, stride=2) → Concat → Conv2D → Dropout → Conv2D → BatchNorm | 256 | 0.4 |
| Decoder Block 2 | Conv2DTranspose(4x4, stride=2) → Concat → Conv2D → Dropout → Conv2D → BatchNorm | 128 | 0.3 |
| Decoder Block 3 | Conv2DTranspose(4x4, stride=2) → Concat → Conv2D → Dropout → Conv2D → BatchNorm | 64 | 0.2 |
| Decoder Block 4 | Conv2DTranspose(4x4, stride=2) → Concat → Conv2D → Dropout → Conv2D | 32 | 0.1 |
| **Output** | Conv2D(1x1, sigmoid) | 1 | — |

### Critical Implementation Detail: Layer Ordering

The layer order within each encoder block is **Conv → Dropout → Conv → BatchNorm**, NOT the more common Conv → Conv → BatchNorm → Dropout. This ordering is critical because the pre-trained weights are saved with this exact layer sequence. Loading weights into a mismatched architecture produces degraded segmentation masks (we verified this — incorrect ordering dropped tooth detection from 28 to 7 teeth on the same image).

### Framework & Configuration

- **Framework**: TensorFlow 2.x / Keras
- **Input shape**: `(512, 512, 1)` — single-channel grayscale
- **Output shape**: `(512, 512, 1)` — per-pixel probability mask
- **Activation**: ReLU (hidden), Sigmoid (output)
- **Kernel initializer**: He Normal
- **Total parameters**: ~7.8M
- **Weight file**: `dental_xray_seg.h5` (~161 MB)
- **Weight loading**: `model.load_weights()` (not `load_model()`, which fails on legacy Keras format due to unrecognized `groups` kwarg in newer TF versions)

```python
# Architecture exactly matches the original repo's model.py
# Layer order: Conv → Dropout → Conv → BatchNorm → Pool
model = _build_unet()
model.load_weights("dental_xray_seg.h5")
```

---

## 2. Training Data & Weights

### Dataset

The model was trained on the **Tufts Dental Database** — 1000 panoramic dental X-ray images with corresponding segmentation masks. The dataset includes:

- **Source**: [Tufts Dental Database](https://www.kaggle.com/datasets) (via the original repo's `download_dataset.py`)
- **Split**: 105 training / ~11 test images
- **Augmentation**: RandomCrop, BrightnessContrast, ShiftScaleRotate, GaussNoise, HorizontalFlip, Downscale (5x augmentation passes)
- **Training**: Adam optimizer, binary cross-entropy loss, 200 epochs, batch size 8

### Pre-trained Weights

We use the pre-trained weights published by the original authors to HuggingFace Spaces:

```
Model: SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image-Using-U-Net
File:  dental_xray_seg.h5
Size:  161 MB
Path:  backend/models/spaces--SerdarHelli--*/snapshots/*/dental_xray_seg.h5
```

We optimized the post-processing parameters specifically for our pipeline's use case, tuning the morphological operations and contour extraction to produce clean, visually appealing overlays suitable for a clinical UI rather than the original repo's research-oriented bounding box output.

---

## 3. Inference Pipeline

The full inference pipeline lives in `backend/app/services/tooth_segmentation.py`.

### Step-by-Step Flow

```
Raw Image Bytes
       │
       ▼
┌─────────────────┐
│  cv2.imdecode   │  Decode PNG/JPEG → grayscale numpy array
│  IMREAD_GRAY    │  Original dimensions preserved (e.g., 3126×1300)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  cv2.resize     │  Resize to 512×512 (INTER_LANCZOS4)
│  normalize /255 │  Float32, range [0, 1]
│  reshape        │  (1, 512, 512, 1) batch tensor
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  model.predict  │  U-Net forward pass
│                 │  Output: (1, 512, 512, 1) probability mask
│                 │  Values: 0.0 (background) → 1.0 (tooth)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CCA Post-      │  Morphological ops + Connected Component Analysis
│  Processing     │  (see Section 4)
└────────┬────────┘
         │
         ▼
   Labels Map (H×W int32)
   Each tooth = unique integer label
```

### Key Code

```python
# Preprocess
resized = cv2.resize(img, (512, 512), interpolation=cv2.INTER_LANCZOS4)
normalized = np.float32(resized / 255.0).reshape(1, 512, 512, 1)

# Inference
prediction = model.predict(normalized, verbose=0)
raw_mask = prediction[0, :, :, 0]  # (512, 512) float32

# Post-process
binary, labels = _cca_postprocess(raw_mask, orig_h, orig_w)
```

---

## 4. CCA Post-Processing

The Connected Component Analysis (CCA) pipeline transforms the raw U-Net probability mask into individually labeled tooth regions. This pipeline exactly matches the original repository's `CCA_Analysis.py` with parameters from their `Main.ipynb` (Cell 25: `erode_iteration=3, open_iteration=2`).

### Pipeline Steps

```
Raw Mask (512×512 float)
       │
       ▼
┌──────────────────────────┐
│ 1. RESIZE                │  cv2.resize → original dimensions
│    INTER_LANCZOS4        │  e.g., 3126×1300
│    Convert to 3-channel  │  uint8 BGR (required for filter2D)
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 2. MORPHOLOGICAL OPENING │  cv2.morphologyEx(MORPH_OPEN)
│    kernel: 5×5           │  Removes small noise spots and
│    iterations: 2         │  isolated false-positive pixels
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 3. SHARPENING FILTER     │  cv2.filter2D with kernel:
│    3×3 edge-enhance      │  [[-1,-1,-1],[-1, 9,-1],[-1,-1,-1]]
│                          │  Enhances tooth boundary edges
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 4. EROSION               │  cv2.erode
│    kernel: 5×5           │  CRITICAL: separates adjacent teeth
│    iterations: 3         │  that merged in the U-Net mask
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 5. OTSU THRESHOLD        │  cv2.cvtColor → grayscale
│                          │  cv2.threshold(THRESH_BINARY +
│                          │  THRESH_OTSU) → clean binary mask
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 6. CONNECTED COMPONENTS  │  cv2.connectedComponents
│    8-connectivity        │  Each tooth → unique integer label
│                          │  Background = 0
└──────────┬───────────────┘
           │
           ▼
   Labels Map: np.ndarray (H×W, dtype=int32)
   Example: 28 unique labels = 28 detected teeth
```

### Why Each Step Matters

| Step | Without It | With It |
|------|-----------|---------|
| Morphological opening | Small noise blobs counted as teeth | Clean tooth regions only |
| Sharpening | Tooth boundaries blend into jaw bone | Crisp edges between teeth and bone |
| Erosion (3 iterations) | Adjacent teeth merge into single CCA component (7-11 "teeth" detected) | Individual teeth properly separated (28 teeth detected) |
| Otsu threshold | Gradient values cause partial components | Clean binary: fully tooth or fully background |
| 8-connectivity CCA | — | Each isolated white region gets unique label |

---

## 5. Contour Extraction

Two modes of contour extraction are supported:

### Auto-Scan (All Teeth)

`extract_all_tooth_contours()` iterates over every CCA label and extracts the outer contour:

```python
for label in unique_labels:
    component_mask = np.uint8(labels == label) * 255
    contours, _ = cv2.findContours(component_mask, RETR_EXTERNAL, CHAIN_APPROX_SIMPLE)
    contour = max(contours, key=cv2.contourArea)

    # Filter noise (area < 2000px)
    if cv2.contourArea(contour) < 2000:
        continue

    # Smooth for clean rendering
    epsilon = 0.008 * cv2.arcLength(contour, True)
    smoothed = cv2.approxPolyDP(contour, epsilon, True)

    # Compute centroid
    M = cv2.moments(contour)
    cx, cy = int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])
```

### Single Tooth (Click-Based)

`extract_tooth_contour()` uses a zone-based lookup (FDI tooth numbering → pixel region) to identify which CCA component corresponds to the clicked tooth:

1. Map FDI tooth number → `PANORAMIC_TEETH` zone (normalized coordinates)
2. Convert zone to pixel coordinates
3. Find which CCA label has the most pixels within the zone
4. **Zone-clip** the component mask to prevent multi-tooth blobs from extending beyond the target tooth's region
5. Extract and smooth the contour

The zone-clipping step is critical: even with erosion, some adjacent teeth may share a CCA component. By intersecting the component mask with the zone (plus 15% horizontal / 10% vertical padding), we isolate only the relevant portion.

---

## 6. Frontend Rendering

Tooth contours are rendered as SVG overlays on top of the X-ray image using React components.

### SegmentationOverlay Component

```tsx
// Each contour is an SVG path overlaid on the image
<svg
  className="absolute inset-0 pointer-events-none"
  width={displayWidth}      // Current rendered image width
  height={displayHeight}    // Current rendered image height
  viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}  // Native image coords
>
  <path
    d="M x0,y0 L x1,y1 L x2,y2 ... Z"  // Contour points
    fill="#FF3B3B30"     // Semi-transparent red fill
    stroke="#FF3B3B"     // Solid red stroke
    strokeWidth={2.5}
    filter="url(#glow)"  // Gaussian blur glow effect
  />
</svg>
```

### Coordinate System

- **Contour points** are in native image coordinates (e.g., 3126×1300)
- **SVG viewBox** maps native coordinates to displayed dimensions
- **ResizeObserver** keeps SVG dimensions synchronized with the `<img>` element, so contours scale correctly during window/panel resizing

```typescript
// ResizeObserver keeps overlays in sync
useEffect(() => {
  const observer = new ResizeObserver(() => {
    setImgSize({
      width: img.clientWidth,
      height: img.clientHeight,
    });
  });
  observer.observe(img);
  return () => observer.disconnect();
}, [imageUrl]);
```

---

## 7. Diagnostic Analysis (Gemini Vision)

After segmentation, findings are detected using **Google Gemini 2.0 Flash** as a vision model for radiological analysis.

### Two Analysis Modes

| Mode | Trigger | Prompt Strategy |
|------|---------|----------------|
| **Single Tooth** | Click on a tooth | "Focus ONLY on tooth #N (FDI numbering). List pathological findings for THIS TOOTH ONLY." |
| **Full Scan** | Auto-Scan button | "Examine ALL visible teeth and identify any pathological findings." |

### Detectable Conditions

```python
CONDITIONS = [
    "cavity",              # Dental caries / decay
    "bone_loss",           # Periodontal bone loss
    "periapical_lesion",   # Infection at root apex
    "impacted",            # Impacted / unerupted tooth
    "fracture",            # Tooth or root fracture
    "root_resorption",     # Root shortening/dissolution
    "cyst",                # Periapical or dentigerous cyst
    "abscess",             # Acute/chronic abscess
    "crown_defect",        # Defective crown restoration
    "missing",             # Absent tooth
]
```

### Response Format

Gemini returns structured JSON which is parsed into `ToothFinding` objects:

```json
[
  {
    "tooth_number": 36,
    "condition": "periapical_lesion",
    "severity": "moderate",
    "confidence": 0.90,
    "location_description": "Periapical radiolucency at the mesial root apex"
  }
]
```

### Rate Limiting

Gemini calls are throttled via an `asyncio.Semaphore(3)` to prevent 429 rate limit errors during batch operations.

---

## 8. Clinical Integration Pipeline

The segmentation and diagnostic results flow through the entire clinical workflow:

```
                    ┌──────────────┐
                    │  X-Ray Upload │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Auto-Scan   │
                    │  U-Net + CCA │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌────────────┐ ┌────────────┐ ┌────────────────┐
     │ Tooth Chart│ │  Clinical  │ │   Treatment    │
     │    3D      │ │   Notes    │ │    Timeline    │
     │            │ │            │ │                │
     │ Color-coded│ │ Findings   │ │ CDT codes      │
     │ by finding │ │ Treatment  │ │ Cost estimates │
     │            │ │ Summary    │ │ Urgency order  │
     └────────────┘ └────────────┘ └────────────────┘
```

### Data Flow

1. **Auto-scan** produces `ToothFinding` objects with condition, severity, confidence
2. **Findings merge into `patient_state.tooth_chart`** — a `dict[int, ToothFinding]` keyed by FDI tooth number
3. **Treatment timeline generated** by mapping conditions to CDT codes and cost estimates:

```python
TREATMENT_MAP = {
    "cavity":            ("Composite restoration",     "soon",      1, "D2391", "$150-$300"),
    "periapical_lesion": ("Root canal therapy",         "immediate", 2, "D3310", "$700-$1200"),
    "bone_loss":         ("Scaling & root planing",     "soon",      2, "D4341", "$200-$400"),
    "missing":           ("Implant or bridge evaluation","routine",  3, "D6010", "$1500-$4000"),
    # ...
}
```

4. **Clinical notes output populated** with diagnoses, protocols, timeline, and summaries
5. **Tooth Chart 3D** reads `patient_state.tooth_chart` and color-codes each tooth by condition
6. **Merge, don't overwrite**: imaging findings merge with existing clinical notes findings — teeth already documented from notes are preserved, imaging adds new teeth only

---

## 9. Performance & Caching

### Inference Timing

| Stage | Time | Notes |
|-------|------|-------|
| Model loading (cold start) | ~3-5s | One-time, lazy-loaded into memory |
| U-Net inference (512×512) | ~1-2s | Single forward pass on CPU |
| CCA post-processing | ~200ms | OpenCV morphological operations |
| Contour extraction (28 teeth) | ~100ms | Per-tooth findContours |
| Gemini vision analysis | ~5-10s | API call, rate-limited to 3 concurrent |
| **Total auto-scan** | **~10-18s** | Dominated by Gemini API latency |

### Caching Strategy

```python
_model = None                          # Singleton — loaded once, kept in memory
_labels_cache: dict[str, np.ndarray]   # CCA labels per image_id
_mask_cache: dict[str, np.ndarray]     # Binary mask per image_id
```

- **Model**: loaded once on first inference, kept as global singleton
- **Segmentation results**: cached per `image_id` — subsequent clicks on the same image skip inference entirely and go straight to contour extraction
- **Cache invalidation**: manual via `clear_cache()` or on server restart

---

## 10. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐ │
│  │ DentalXray   │  │ ClinicalNotes│  │ToothChart│  │ Treatment  │ │
│  │ Viewer       │  │ Viewer       │  │   3D     │  │   View     │ │
│  │              │  │              │  │          │  │            │ │
│  │ SVG Overlays │  │ Findings +   │  │ Color-   │  │ CDT codes  │ │
│  │ ResizeObserv │  │ Timeline     │  │ coded    │  │ Costs      │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘ │
│         │                 │               │               │        │
│         └─────────────────┴───────┬───────┴───────────────┘        │
│                                   │                                 │
│                          patientState.tooth_chart                   │
│                          patientState.clinical_notes_output         │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ REST API
┌──────────────────────────────────▼──────────────────────────────────┐
│                        BACKEND (FastAPI)                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Imaging Handler                            │   │
│  │                                                              │   │
│  │  handle_auto_scan()          handle_tooth_click()            │   │
│  │  ├─ extract_all_tooth_      ├─ map_click_to_tooth (FDI)     │   │
│  │  │  contours()              ├─ segment_full_image()         │   │
│  │  ├─ detect_findings_        ├─ extract_tooth_contour()      │   │
│  │  │  full_scan() [Gemini]    ├─ detect_findings_with_llm()  │   │
│  │  ├─ merge → tooth_chart     └─ update patient_state        │   │
│  │  └─ generate timeline                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Tooth Segmentation Service                      │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │   │
│  │  │ U-Net    │→ │ CCA Post- │→ │ Contour  │→ │ SVG Point │  │   │
│  │  │ Inference│  │ Processing│  │ Extract  │  │   List    │  │   │
│  │  │ (TF/CPU) │  │ (OpenCV)  │  │ (OpenCV) │  │           │  │   │
│  │  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────┐  ┌────────────────────────────────────┐   │
│  │ Gemini Vision API   │  │ Finding Detector                   │   │
│  │ (gemini-2.0-flash)  │  │ Structured JSON → ToothFinding     │   │
│  └─────────────────────┘  └────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## References

- **U-Net Architecture**: Ronneberger, O., Fischer, P., & Brox, T. (2015). "U-Net: Convolutional Networks for Biomedical Image Segmentation." MICCAI 2015.
- **Original Implementation**: [SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image-Using-U-Net](https://github.com/SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image-Using-U-Net)
- **Dataset**: Tufts Dental Database — Panoramic X-ray images with ground truth segmentation masks
- **Connected Component Analysis**: OpenCV `cv2.connectedComponents` with 8-connectivity
- **Gemini Vision**: Google Gemini 2.0 Flash for multimodal radiological analysis
- **TensorFlow**: Model inference via `tf.keras` with CPU execution
