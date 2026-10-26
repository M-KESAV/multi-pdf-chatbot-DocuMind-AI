# DocuMind AI — Production Deployment & Operations Guide

This document provides complete instructions for configuring, operating, and deploying **DocuMind AI** in production environments.

---

## 1. Architecture Overview

- **Frontend**: React 18 SPA built with Vite, utilizing vanilla CSS design tokens for an accessible, premium light theme.
- **Backend API**: Python FastAPI application exposing asynchronous document processing, FAISS vector search, and LLM inference endpoints.
- **Embedding Pipeline**: Google Gemini Embedding API (`gemini-embedding-001` or `models/text-embedding-004`) with safe batching, exponential backoff, and atomic rollback.
- **Conversational Engine**: Groq-hosted LLMs (e.g. `openai/gpt-oss-120b` or `llama-3.3-70b-versatile`) with prompt-level anti-hallucination safeguards and strict citation grounding.
- **Vector Storage**: Local/volume-persisted FAISS vector index with metadata consistency (`doc_metadata.json`).

---

## 2. Environment Variables Specification

### Backend Configuration (`backend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | String | *Required* | API key from [Google AI Studio](https://aistudio.google.com/app/apikey) for generating vector embeddings. |
| `GROQ_API_KEY` | String | *Required* | API key from [Groq Console](https://console.groq.com/keys) for chat, summaries, comparison, and study generation. |
| `GROQ_MODEL` | String | `openai/gpt-oss-120b` | Groq chat completion model name. |
| `EMBEDDING_MODEL` | String | `gemini-embedding-001` | Google Gemini embedding model name. |
| `CHUNK_SIZE` | Integer | `1000` | Text chunk size in characters for recursive splitting. |
| `CHUNK_OVERLAP` | Integer | `150` | Overlap in characters between adjacent chunks. |
| `TOP_K_CHUNKS` | Integer | `4` | Number of most relevant chunks retrieved per query. |
| `EMBEDDING_BATCH_SIZE` | Integer | `10` | Max chunks sent per embedding API call (prevents 429 quota spikes). |
| `EMBEDDING_BATCH_DELAY` | Float | `0.6` | Delay (in seconds) between consecutive embedding batches. |
| `EMBEDDING_MAX_RETRIES` | Integer | `3` | Max exponential backoff retry attempts for temporary rate limits. |
| `HOST` | String | `0.0.0.0` | Bind host for Uvicorn server. |
| `PORT` | Integer | `8000` | Bind port for Uvicorn server. |
| `MAX_UPLOAD_SIZE_MB` | Integer | `50` | Maximum allowed upload size per PDF file in megabytes. |
| `ALLOWED_ORIGINS` | String | `http://localhost:5173,...` | Comma-separated list of allowed frontend origins for CORS. |

### Frontend Configuration (`frontend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | String | `""` (Empty) | Base URL of the backend API (e.g., `https://api.documind.example.com`). In local dev, leave blank to use the Vite reverse proxy. |

> [!SECURITY NOTE]
> Never prefix backend API keys with `VITE_`. All Gemini and Groq API calls execute strictly on the backend to avoid secret leakage in client-side bundles.

---

## 3. Local Development & Testing

### Prerequisites
- Python 3.10+ (Tested on Python 3.10 – 3.14)
- Node.js 18+ and npm 9+

### Running the Backend
```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```
Backend runs at `http://localhost:8000`. Swagger documentation is available at `http://localhost:8000/docs`.

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`. Vite automatically proxies requests starting with `/api` to `http://localhost:8000`.

### Running Automated Test Suites
```bash
# Backend pytest suite (14 unit/integration tests)
cd backend
pytest tests -v

# Frontend production bundle validation
cd frontend
npm run build
```

---

## 4. Recommended Production Hosting Options

### Option A: Paired Modern PaaS (Recommended for Simplicity & Free-Tier)
- **Frontend**: Deploy on **Vercel** or **Cloudflare Pages** (Free tier, global CDN, instant preview deployments).
  - Build command: `npm run build`
  - Output directory: `dist`
  - Environment Variable: `VITE_API_BASE_URL=https://<your-backend-domain>.onrender.com`
- **Backend**: Deploy on **Render** or **Railway** (Web Service).
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Persistent Disk: Attach a persistent disk mounted to `/app/storage` (Render Disk or Railway Volume) to preserve indexed FAISS vectors across container redeploys.
  - Environment Variables: Set `GOOGLE_API_KEY`, `GROQ_API_KEY`, `ALLOWED_ORIGINS=https://<your-frontend>.vercel.app`.

### Option B: Single Container / Docker on Fly.io or DigitalOcean App Platform
- Package both frontend and backend or run the FastAPI backend with a persistent volume mounted at `backend/storage`.
- Provides predictable memory allocation for FAISS vector calculations.

---

## 5. Security & Reliability Checklist

1. **Secrets**: `.env` and `storage/` are excluded by `.gitignore`. Confirm before committing with `git status`.
2. **CORS**: Set `ALLOWED_ORIGINS` to the exact production frontend domain instead of `*` when credentials or strict isolation is needed.
3. **Uploads**: PDF files are validated by extension, size limit (`MAX_UPLOAD_SIZE_MB`), and magic header bytes (`%PDF-`). Encrypted/password-protected PDFs are rejected gracefully with a 400 error.
4. **Quota Recovery**: If Google Gemini returns HTTP 429 (`RESOURCE_EXHAUSTED`), the backend retries with exponential backoff and rolls back partial index state atomically without corrupting existing documents.
5. **Persistence**: FAISS indexes are saved to `backend/storage/faiss_index`. In containerized environments, this directory must reside on a persistent volume.
