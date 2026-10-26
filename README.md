# ⚡ DocuMind AI — Enterprise Multi-PDF Document Intelligence Workspace

DocuMind AI is a full-stack, enterprise-grade Retrieval-Augmented Generation (RAG) platform that transforms complex PDF document collections into an interactive, conversational intelligence workspace.

Built with a high-performance **FastAPI** backend and a **React.js + Vite** single-page application, featuring a clean, premium **white/light theme** with high-contrast typography, subtle glassmorphic elevation, and curated brand accents (**Plus Jakarta Sans**, **Inter**, and royal violet/cyan accents).


https://multi-pdf-chatbot-docu-mind-ai.vercel.app/
---

## 🌟 Key Features

### 1. Multi-PDF Ingestion & Page-Level Grounding
- **Simultaneous Uploads**: Upload multiple PDFs (up to 50MB per file) via an interactive drag-and-drop zone.
- **Server-Side Security**: Magic byte verification (`%PDF-`), password/encryption detection, empty-text detection, and path-traversal filename sanitization.
- **Page-Level Source Citations**: Every single answer derived from documents explicitly preserves the original PDF filename and 1-indexed page number (e.g. `p. 2`). Clickable citation badges open a modal previewing the exact extracted text chunk.
- **Quota-Resilient Embeddings & Idempotency**: SHA-256 content hashing skips re-embedding unchanged documents. Bounded exponential backoff with jitter handles transient rate limits, while daily quota limits fail fast without futile retries.
- **Individual Document Management**: View page counts, chunk counts, and file sizes. Remove individual documents with real-time FAISS index re-vectorization.
- **Document Search**: Real-time search filter in the sidebar to locate documents in large collections.

### 2. High-Value AI Intelligence Modes
- **💬 Conversational QA**: Multi-turn dialogue with conversation memory (last 5 exchanges) for natural follow-up questions, strictly grounded in the uploaded context.
- **📑 Executive Summarization**: Synthesizes high-impact executive summaries and bold key takeaways from a specific document or across the entire collection.
- **🎓 Interactive Study Pack**: Generates comprehensive revision notes, interactive flip flashcards (click to reveal answer), and multiple-choice practice quizzes with instant answer validation and explanations.
- **⚖️ Document Comparison**: Cross-examines multiple PDFs side-by-side, detailing shared themes, conflicting methodologies, and unique scope.

### 3. Productivity & Enterprise Security
- **Conversation Export**: Export entire chat sessions to formatted Markdown (`.md`) files with cited sources and timestamps.
- **Answer Quality Feedback**: Built-in rating buttons (Helpful / Unhelpful) for quality tracking.
- **Session Isolation**: Independent conversation history resets per session without wiping uploaded documents.
- **Prompt Injection Defense**: Passive reference data guardrails prevent adversarial text inside PDFs from overriding system prompts.
- **Zero API Key Leakage**: Keys for Google Gemini and Groq reside exclusively in `backend/.env` and are never exposed to the client.

---

## 🏗️ Technical Architecture

```mermaid
flowchart TD
    subgraph Frontend["React.js + Vite (Port 5173)"]
        UI[DocuMind AI Workspace]
        Tabs[Mode Tabs: Chat | Summary | Study | Compare]
        Drawer[Document Management Sidebar & Filter]
        Citations[Clickable Page Citation Chips & Excerpt Popover]
    end

    subgraph Backend["FastAPI Backend (Port 8000)"]
        API["REST Endpoints (/api/upload, /api/chat, /api/summarize, /api/compare, etc.)"]
        PyPDF["PyPDF Page-by-Page Parser & Magic Byte Validator"]
        Splitter["RecursiveCharacterTextSplitter (chunk: 1000, overlap: 150)"]
        Gemini["Google Gemini Embeddings (gemini-embedding-001)"]
        FAISS_DB["FAISS Vector Store (Thread-Safe + storage/faiss_index Persistence)"]
        Groq["Groq LLM Engine (openai/gpt-oss-120b)"]
    end

    Drawer -->|Upload / Delete PDFs| API
    API --> PyPDF --> Splitter --> Gemini --> FAISS_DB
    Tabs -->|Query / Summarize / Study / Compare| API
    API --> FAISS_DB -->|Retrieve Top-k Chunks + Source Metadata| Groq
    Groq -->|Grounded Answers + Citations| UI
    UI --> Citations
```

---

## 🎨 Design System & Color Palette (Light Theme)

DocuMind AI features a clean, high-contrast, premium light aesthetic:

| Token | Hex / Value | Description |
|---|---|---|
| `--bg-primary` | `#F8FAFC` | Main canvas background |
| `--bg-secondary` | `#FFFFFF` | Sidebar and panel surface |
| `--surface-primary` | `#FFFFFF` | Card surface and user message bubble |
| `--surface-elevated` | `#F1F5F9` | Hovered cards, system notifications, assistant bubbles |
| `--accent-primary` | `#6D5AE6` | Royal violet primary brand accent |
| `--accent-primary-hover` | `#5844D6` | Hovered state for buttons and tabs |
| `--accent-soft` | `#F0EDFF` | Light lavender pill backgrounds and badges |
| `--accent-secondary` | `#0891B2` | Cyan secondary accent for highlights and icons |
| `--text-primary` | `#0F172A` | Deep slate primary text (WCAG AAA contrast) |
| `--text-secondary` | `#475569` | Secondary body text |
| `--text-muted` | `#64748B` | Captions, dates, and subtle counters |
| `--border-subtle` | `#E2E8F0` | Subtle clean card borders |
| `--status-success` | `#059669` | Success green badges and alerts |
| `--status-error` | `#DC2626` | Error alerts and destructive actions |

- **Typography**: Headings styled in **Plus Jakarta Sans**, body text in **Inter**, code in **JetBrains Mono**.
- **Responsive Layout**: Fluid flex and grid layouts responsive across mobile (320px–480px), tablet (768px), laptop (1024px, 1366px), and desktop (1920px).

---

## 🚦 Gemini 429 Quota Architecture & Diagnostics

DocuMind AI implements intelligent classification and recovery for Google Gemini API limits:

1. **RPM (Requests Per Minute) Rate Limits**:
   - Google AI Studio free tier limits embedding requests to 15 RPM.
   - Handled via bounded exponential backoff with jitter and automated `Retry-After` parsing (up to 3 attempts).
2. **RPD (Requests Per Day) Quota Exhaustion**:
   - Google AI Studio free tier limits embedding to 1,500 requests per day.
   - When daily quota is exhausted, DocuMind AI immediately **fails fast** with a clear message and actionable instructions, avoiding wasted retries or hung requests.
   - *Resolution*: Wait for daily quota reset at 00:00 UTC (Midnight Pacific Time), switch to pay-as-you-go billing, or configure a fresh API key in `backend/.env`.
3. **SHA-256 Content-Hash Idempotency**:
   - Documents compute a cryptographic SHA-256 hash upon upload.
   - If a document has already been indexed with the identical content, re-embedding is completely bypassed, saving 100% of the API quota on repeated operations.
4. **Thread-Safe Vector Operations**:
   - All FAISS index updates, deletions, and persistence writes are guarded by a re-entrant thread lock (`self._index_lock`) preventing race conditions during concurrent user uploads.

---

## 📋 Prerequisites

- **Python**: 3.10+ (tested on Python 3.14 on Windows)
- **Node.js**: v18+ (tested on Node v20/v26) and **npm**
- **Google Gemini API Key**: Free from [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Groq API Key**: Free from [Groq Console](https://console.groq.com/keys).

---

## ⚙️ Step-by-Step Setup Guide

### 1. Configure Environment Secrets

Copy the provided environment templates:

```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

Configure your actual API keys in `backend/.env`:

```ini
GOOGLE_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

GROQ_MODEL=openai/gpt-oss-120b
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=gemini-embedding-001

CHUNK_SIZE=1000
CHUNK_OVERLAP=150
TOP_K_CHUNKS=4

EMBEDDING_BATCH_SIZE=10
EMBEDDING_BATCH_DELAY=0.6
EMBEDDING_MAX_RETRIES=3

HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
MAX_UPLOAD_SIZE_MB=50
```

Configure frontend in `frontend/.env`:
```ini
# For local dev using Vite proxy, leave empty or set to http://localhost:8000
VITE_API_BASE_URL=
```

---

### 2. Run the Backend Server (FastAPI)

Open a terminal in the `backend/` directory:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch the FastAPI server
python run.py
```

- API Server: **`http://localhost:8000`**
- Interactive Swagger Documentation: **`http://localhost:8000/docs`**
- Health Check: **`http://localhost:8000/api/health`**

---

### 3. Run the Frontend Server (React + Vite)

Open a second terminal in the `frontend/` directory:

```bash
# 1. Install dependencies
npm install

# 2. Launch Vite development server
npm run dev
```

- Web Application: **`http://localhost:5173`**

---

## 🧪 Testing & Verification

### Running Backend Unit & Integration Tests:
```bash
cd backend
python -m pytest tests -v
```
All **21 automated tests** cover:
- Health check & status verification
- Chunking & metadata preservation
- Dense bibliography detection and deprioritization
- Chat refusal suppression of citations
- RAG answer synthesis across multiple documents
- Study mode, quiz formatting, and flashcards
- Summary structure and key takeaway extraction
- Granular Gemini error classification (RPM vs RPD vs Auth vs Model)
- Daily quota fail-fast without futile retries
- Transient rate-limit retry and backoff recovery
- SHA-256 idempotency (skipping duplicate embedding)
- Path traversal filename sanitization
- PDF magic header validation (`%PDF-`)
- CORS configuration parsing

### Running Frontend Production Build:
```bash
cd frontend
npm run build
```
Compiles and bundles the production assets into `frontend/dist/` with zero errors.

---

## 📡 API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/status` | Current status, active models, document and chunk counts |
| `GET` | `/api/documents` | List all uploaded documents with page/chunk counts and timestamps |
| `DELETE`| `/api/documents/{filename}` | Remove a document and atomically rebuild vector store |
| `POST` | `/api/upload` | Upload multiple PDF files (validates 50MB, magic bytes, encrypt check) |
| `POST` | `/api/chat` | Conversational RAG query with source citations and injection defense |
| `POST` | `/api/summarize` | Generate executive summaries and bulleted key takeaways |
| `POST` | `/api/compare` | Multi-document comparative analysis |
| `POST` | `/api/study-mode` | Generate revision notes, interactive flashcards, and quizzes |
| `POST` | `/api/feedback` | Record helpful/unhelpful rating on an assistant answer |
| `GET` | `/api/history` | Retrieve conversation history for current session |
| `POST` | `/api/history/clear`| Clear conversation messages only (preserves documents) |
| `POST` | `/api/clear` | Wipe all documents, vector store, and conversations |

---

## 📁 Project Directory Structure

```
multi-pdf-chatbot/
├── multipdf_rag.ipynb            # Original reference notebook (retained & untouched)
├── README.md                     # Complete project documentation
├── DEPLOYMENT.md                 # Production deployment manual (Docker, Render, Vercel)
├── .gitignore                    # Git exclusions (.env, storage, node_modules, scratch)
├── backend/
│   ├── .env                      # Local configuration with API keys (ignored by git)
│   ├── .env.example              # Secret-free template
│   ├── requirements.txt          # Python dependencies
│   ├── run.py                    # Server launcher
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py             # Settings validation with Pydantic
│   │   ├── models.py             # Pydantic schemas for all endpoints
│   │   ├── rag_engine.py         # PyPDF, chunking, Gemini embeddings, FAISS, Groq LLM
│   │   └── main.py               # FastAPI router with CORS & security
│   └── tests/
│       ├── conftest.py           # Pytest sys.path setup
│       └── test_rag.py           # 21 automated unit & integration tests
└── frontend/
    ├── package.json              # React 18, Vite, Lucide icons, Marked
    ├── .env.example              # Frontend environment template
    ├── vite.config.js            # Reverse proxy to backend (:8000)
    ├── index.html                # App shell, Plus Jakarta Sans, SVG favicon
    └── src/
        ├── App.jsx               # Main container managing modes & state
        ├── main.jsx              # React entry point
        ├── index.css             # Light theme design system & tokens
        ├── services/
        │   └── api.js            # Typed API client connecting to FastAPI
        └── components/
            ├── DocuMindIcon.jsx  # Custom SVG brand identity logo
            ├── Header.jsx        # Navbar with mode tabs, model tag, export
            ├── Sidebar.jsx       # Document management drawer with search & delete
            ├── FileUpload.jsx    # Drag-and-drop uploader with 50MB validation
            ├── ChatWindow.jsx    # Message stream & welcome illustration
            ├── ChatComposer.jsx  # Auto-expanding question input bar
            ├── MessageBubble.jsx # Markdown rendering, citations & feedback
            ├── SourceCard.jsx    # Citation pill & chunk excerpt preview modal
            ├── SummaryView.jsx   # Executive Document Summarizer
            ├── StudyModeView.jsx # Revision notes, flip flashcards, and quizzes
            └── CompareView.jsx   # Multi-document comparison view
```

---

## 🚀 Deployment Options

See [DEPLOYMENT.md](DEPLOYMENT.md) for full step-by-step guides for:
- **Docker Compose**: Containerized multi-service deployment.
- **Render / Railway**: Managed backend hosting with persistent disk volumes for FAISS.
- **Vercel / Netlify**: Static single-page application hosting for frontend.

---

## 📄 License

This project is licensed under the MIT License.
