# 🦷 toothfairy

*One click. Every diagnosis. Zero tab switching.*

**toothfairy** is a _cursor-inspired_, AI-powered dentistry assistant built for both sides of the chair. For dentists, it brings X-ray analysis, clinical notes extraction, and treatment planning into a single intelligent workspace, streamlining + syncing workflows (i.e. removing the need for doctors to grab physical documents). For patients, it replaces confusion and paper printouts with a visual, plain-language dashboard they can check from home. It remembers patient records across every visit, giving clinicians and clients the same complete picture: current findings, treatment history, and what comes next :)

## Demo Images

<p>
<img src="https://private-user-images.githubusercontent.com/191622350/563712070-c903ebca-9778-4574-8a5e-21e8b14a03c8.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzM1Nzg1MjIsIm5iZiI6MTc3MzU3ODIyMiwicGF0aCI6Ii8xOTE2MjIzNTAvNTYzNzEyMDcwLWM5MDNlYmNhLTk3NzgtNDU3NC04YTVlLTIxZThiMTRhMDNjOC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMxNVQxMjM3MDJaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT00Y2IyMTJhYzIxZGNhYzY0MWQ1NTQyMzI3NzJhMjIxZDIzYjc0NWE1OGVjNzcyZTczNTFlZTVmZGE5ZTQwM2M1JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.VvLOKmr-tMY3oLphPl1md8UgdUodi8rC8_0hFVY1O4E" alt="image1" width="48%">
<img src="https://private-user-images.githubusercontent.com/191622350/563712111-8dc540f1-6dcc-4742-b844-8037144bf5c3.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzM1Nzg1MzYsIm5iZiI6MTc3MzU3ODIzNiwicGF0aCI6Ii8xOTE2MjIzNTAvNTYzNzEyMTExLThkYzU0MGYxLTZkY2MtNDc0Mi1iODQ0LTgwMzcxNDRiZjVjMy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMxNVQxMjM3MTZaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1kYzc4YWYxZGJjMDdhZTFiODhlNjY4ZGFlMTQxODM4ODM1MzBjNTg3Y2IyZmFjMTIxMjQ5MzQ3MTVmNjEwZjI0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.0IHX69XVlzbDhp1gI16TsQYh1MoaW5H5W-m1QZvxRbA" alt="image2" width="48%">
</p>

<p>
<img src="https://private-user-images.githubusercontent.com/191622350/563712148-ea06a251-b581-4266-9b56-8a97d92fa743.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzM1Nzg1NDgsIm5iZiI6MTc3MzU3ODI0OCwicGF0aCI6Ii8xOTE2MjIzNTAvNTYzNzEyMTQ4LWVhMDZhMjUxLWI1ODEtNDI2Ni05YjU2LThhOTdkOTJmYTc0My5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMxNVQxMjM3MjhaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1jYzZmMDJhZmViYzMyMTE2MGMzNTE0MmQ5NjU1ZTY5N2M5YzM2NjQ1ZjJjMGVlOGYxYWFhOWE3OWJmOTE0MmU0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.xRGaWffN3FXc22yXSWAhOa63PtiqQ2wIIgKan6kCRp0" alt="image3" width="48%">
<img src="https://private-user-images.githubusercontent.com/191622350/563712181-642e2c1c-b453-43e2-8461-04efc5809ba3.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzM1Nzg1OTEsIm5iZiI6MTc3MzU3ODI5MSwicGF0aCI6Ii8xOTE2MjIzNTAvNTYzNzEyMTgxLTY0MmUyYzFjLWI0NTMtNDNlMi04NDYxLTA0ZWZjNTgwOWJhMy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMxNVQxMjM4MTFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT02MTEyNDZhYjIzZDk4ZWY5N2I3MmIxOWVjMmQ0N2M3MDI0M2M1N2I1ODA5YzA2MGY4MTMzMTY5NWYxMzAxNjQyJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.k95gRiPL17QLCRg_275McjSUApRim6Nwb7ixxqzZr9k" alt="image4" width="48%">
</p>

<p>
<img src="https://private-user-images.githubusercontent.com/191622350/563712212-9328fe3c-a6cf-4a94-b85e-edceb22e529d.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzM1Nzg2MDEsIm5iZiI6MTc3MzU3ODMwMSwicGF0aCI6Ii8xOTE2MjIzNTAvNTYzNzEyMjEyLTkzMjhmZTNjLWE2Y2YtNGE5NC1iODVlLWVkY2ViMjJlNTI5ZC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMxNVQxMjM4MjFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1lMjk0YzRjMTNhNDliZmZmMzNlMDIyN2I5YWIxZTkyNDc1NzE4MWRmZjRlYTdhY2UxMTYyNWQwMjY0NzRhMjk0JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.eBLn1__q55d-vecR2kzQGMbC9DgOPhrx7ur6Mf4Jcgo" alt="image5" width="48%">
<img src="https://private-user-images.githubusercontent.com/191622350/563712246-30aa7de2-e736-43ce-a5d1-0f4fc47ce764.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzM1Nzg2MjEsIm5iZiI6MTc3MzU3ODMyMSwicGF0aCI6Ii8xOTE2MjIzNTAvNTYzNzEyMjQ2LTMwYWE3ZGUyLWU3MzYtNDNjZS1hNWQxLTBmNGZjNDdjZTc2NC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjYwMzE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI2MDMxNVQxMjM4NDFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT00ZjAyMWQxYjY5ZGIzNjE4ODExMGNiNTllOTNhMzVjZWRiZWM5OTFkNDJhZjg5OTFmMDk0OTUyZDIzY2EyYjZkJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.YFkvlL8DCHsLtmD7viml6OSCcqTFWdopcBGQXfQJChI" alt="image6" width="48%">
</p>

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
