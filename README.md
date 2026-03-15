# 🦷 toothfairy

*One click. Every diagnosis. Zero tab switching.*

**toothfairy** is a _cursor-inspired_, AI-powered dentistry assistant built for both sides of the chair. For dentists, it brings X-ray analysis, clinical notes extraction, and treatment planning into a single intelligent workspace, streamlining + syncing workflows (i.e. removing the need for doctors to grab physical documents). For patients, it replaces confusion and paper printouts with a visual, plain-language dashboard they can check from home. It remembers patient records across every visit, giving clinicians and clients the same complete picture: current findings, treatment history, and what comes next :)

[**CHECK IT OUT**](https://devpost.com/software/tooth-fairy)

## What it Does

Dentists deal with way too many disconnected tools every day: practice management software, separate imaging viewers, static paper charts, CDT code references, insurance portals. None of them talk to each other and none of them remember the patient properly. There's no way to quickly see "tooth #36 had a cavity six months ago, we filled it, and now there's a periapical lesion forming."

But there's another problem nobody talks about: **the patient has no idea what's going on.** You go to the dentist, they point at a blurry X-ray and say "see that shadow?" and you just nod. Then you go home and couldn't tell someone what's wrong with your teeth if you tried.

**For dentists:** Upload an X-ray or highlight clinical notes, and toothfairy extracts findings, lights up affected teeth on an interactive chart, and builds a treatment timeline with CDT codes and costs. It pulls in history from past visits and handles the boring stuff so the dentist can focus on clinical judgment. Shorter appointments, more patients per day.

**For patients:** Color-coded teeth, plain descriptions, treatment timelines, cost estimates. Pull up your dental history at home and see how things have changed.

## Architecture

<div align="center">

<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />

&darr;

<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
<img src="https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white" alt="Pydantic" />

&darr;

<img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Google Gemini" />
&nbsp;&nbsp;
<img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
&nbsp;&nbsp;
<img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV" />
&nbsp;&nbsp;
<img src="https://img.shields.io/badge/Moorcheh_AI-4A90D9?style=for-the-badge&logoColor=white" alt="Moorcheh AI" />
&nbsp;&nbsp;
<img src="https://img.shields.io/badge/PharmacyMCP-16A34A?style=for-the-badge&logoColor=white" alt="PharmacyMCP" />

</div>

| Layer | Service | Purpose |
|-------|---------|---------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Three.js | Three-pane IDE layout, SVG tooth chart, 3D viewer |
| **Backend** | FastAPI, Python, Pydantic | Copilot orchestration, session management, API routing |
| **LLM** | Google Gemini 2.5 Flash (google-genai SDK) | Structured JSON extraction from clinical notes |
| **Vision** | Google Gemini Vision | Pathology detection in X-ray regions |
| **Segmentation** | TensorFlow/Keras (U-Net), OpenCV (CCA + contour extraction) | Semantic segmentation of panoramic X-rays, individual tooth isolation |
| **Medication Lookup** | PharmacyMCP + Health Canada DPD API | Real-time drug product and DIN lookup based on findings |
| **Patient Memory** | Moorcheh AI SDK | Per-patient namespaces, longitudinal history |
| **Streaming** | SSE (sse-starlette) | Real-time copilot log streaming |
| **Image Processing** | Pillow, NumPy | X-ray manipulation and region cropping |

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm**
- **Python 3.10+**
- **pip**

### 1. Clone and install

```bash
git clone https://github.com/your-repo/tooth-fairy.git
cd tooth-fairy
```

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set up environment variables

Create `backend/.env`:

```env
GOOGLE_API_KEY=your_gemini_api_key
MOORCHEH_API_KEY=your_moorcheh_api_key    # optional, works without it
DEMO_MODE=true                             # uses cached data for demo
```

### 3. Run the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Mode

Set `DEMO_MODE=true` in your `.env` to use pre-computed cached data for all copilots. This skips live API calls and gives you a reliable demo experience. Cached assets live in `assets/cache/`.
