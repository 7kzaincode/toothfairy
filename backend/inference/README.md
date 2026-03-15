# inference/

MedSAM2 tooth segmentation service, deployed to Modal GPU infrastructure.

This folder is a **separate deployment** from the FastAPI backend.
The backend calls the resulting Modal endpoint URL — the two are connected
only through `MODAL_ENDPOINT_URL` in your `.env`.

## Files

| File | Purpose |
|------|---------|
| `modal_medsam2.py` | Modal app definition — entry point for deploy |
| `sam2_model.py` | Model loading / SAM wrapper |
| `predict.py` | Inference logic: image load → segment → contour |
| `requirements.txt` | GPU container dependencies |
| `cog.yaml` | Replicate config (alternative to Modal) |

## Setup

### 1. Authenticate with Modal (one-time)
```bash
pip install modal
python3 -m modal setup
```

### 2. Download model weights (one-time)
```bash
modal run modal_medsam2.py::download_weights
```
Downloads the MedSAM ViT-B checkpoint (~360MB) into a persistent Modal volume.

### 3. Deploy
```bash
modal deploy modal_medsam2.py
```
Modal prints your endpoint URL. Add it to `backend/.env`:
```
MODAL_ENDPOINT_URL=https://aidanjnn--medsam2-segmentation-...modal.run
```

## Notes

- First request after a cold start takes ~20–30s (GPU container spin-up)
- Container stays warm for 5 minutes between requests
- If Modal is unavailable, the backend `ReliabilityManager` automatically
  falls back to a bounding box estimate — no action needed
