from typing import List, Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, status, Path as FPath
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import (
    ChatRequest,
    ChatResponse,
    UploadResponse,
    StatusResponse,
    ClearResponse,
    ChatMessage,
    DocumentMetadata,
    SummarizeRequest,
    SummarizeResponse,
    CompareRequest,
    CompareResponse,
    StudyModeRequest,
    StudyModeResponse,
    FeedbackRequest,
    FeedbackResponse
)
from app.rag_engine import (
    rag_engine,
    GeminiQuotaExceededError,
    GeminiRateLimitError,
    GeminiDailyQuotaExceededError,
    GeminiAuthError,
    GeminiModelConfigError
)

app = FastAPI(
    title="DocuMind AI — Intelligent Multi-PDF RAG Engine",
    description="Enterprise Document Intelligence API powered by PyPDF, LangChain, Google Gemini, FAISS, and Groq",
    version="2.0.0"
)

# Parse configured CORS origins
raw_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if "*" in raw_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=raw_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/api/health", summary="Health Check")
def health_check():
    return {
        "status": "healthy",
        "service": "DocuMind AI Workspace Engine",
        "version": "2.0.0"
    }

@app.get("/api/status", response_model=StatusResponse, summary="Get System & Knowledge Status")
def get_status():
    stat = rag_engine.status
    has_keys = settings.has_google_key and settings.has_groq_key
    
    if not has_keys:
        system_status = "missing_api_keys"
    elif stat["has_index"]:
        system_status = "ready"
    else:
        system_status = "awaiting_pdfs"

    return StatusResponse(
        status=system_status,
        has_google_key=settings.has_google_key,
        has_groq_key=settings.has_groq_key,
        total_chunks=stat["total_chunks"],
        indexed_files=stat["indexed_files"],
        documents=stat["documents"],
        groq_model=settings.GROQ_MODEL,
        embedding_model=settings.EMBEDDING_MODEL
    )

@app.get("/api/documents", response_model=List[DocumentMetadata], summary="Get List of Indexed Documents")
def list_documents():
    return rag_engine.get_document_list()

@app.delete("/api/documents/{filename}", summary="Remove a Document from Knowledge Base")
def delete_document(filename: str = FPath(..., description="Filename to remove")):
    try:
        safe_name = Path(filename).name
        res = rag_engine.remove_document(safe_name)
        return {
            "message": f"Successfully removed '{safe_name}' and updated vector index.",
            "remaining_count": res["remaining_count"],
            "documents": res["documents"]
        }
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to remove document: {str(err)}")

@app.post("/api/upload", response_model=UploadResponse, summary="Upload and Index PDF Documents")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    if not settings.has_google_key:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_API_KEY is not configured in backend/.env. Please configure your Gemini API key."
        )

    pdf_data = []
    for file in files:
        safe_filename = Path(file.filename).name
        if not safe_filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format for '{file.filename}'. DocuMind only processes .pdf documents."
            )
        try:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' is empty.")
            
            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File '{file.filename}' exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB maximum file size limit."
                )
            
            # Validate PDF magic header within the first 1024 bytes
            if b"%PDF-" not in content[:1024]:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' is not a valid PDF document (missing standard '%PDF-' magic header)."
                )

            pdf_data.append((safe_filename, content))
        except HTTPException:
            raise
        except Exception as err:
            raise HTTPException(status_code=400, detail=f"Error reading '{file.filename}': {str(err)}")

    try:
        result = rag_engine.process_and_index_pdfs(pdf_data)
        return UploadResponse(
            message=f"Successfully indexed {result['total_chunks']} chunks from {result['total_pages']} pages across {len(result['files_processed'])} PDF(s).",
            files_processed=result["files_processed"],
            total_pages=result["total_pages"],
            total_chunks=result["total_chunks"],
            documents=result["documents"]
        )
    except GeminiDailyQuotaExceededError as daily_err:
        raise HTTPException(status_code=429, detail=f"Google Gemini Free Tier daily embedding quota (1,500 RPD) has been exhausted: {daily_err}")
    except GeminiRateLimitError as rate_err:
        raise HTTPException(status_code=429, detail=f"Google Gemini temporary rate limit (15 RPM): {rate_err}")
    except GeminiQuotaExceededError as quota_err:
        raise HTTPException(status_code=429, detail=str(quota_err))
    except GeminiAuthError as auth_err:
        raise HTTPException(status_code=401, detail=str(auth_err))
    except GeminiModelConfigError as model_err:
        raise HTTPException(status_code=400, detail=str(model_err))
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Internal indexing error: {str(err)}")

@app.post("/api/chat", response_model=ChatResponse, summary="Query the PDF Knowledge Base")
def chat(request: ChatRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not settings.has_groq_key:
        raise HTTPException(
            status_code=400,
            detail="GROQ_API_KEY is not configured in backend/.env. Please configure your Groq key."
        )

    try:
        answer, citations = rag_engine.chat(
            question=question,
            session_id=request.session_id,
            top_k=request.top_k or settings.TOP_K_CHUNKS
        )
        return ChatResponse(
            answer=answer,
            sources=citations,
            session_id=request.session_id
        )
    except GeminiDailyQuotaExceededError as daily_err:
        raise HTTPException(status_code=429, detail=f"Google Gemini Free Tier daily embedding quota (1,500 RPD) has been exhausted: {daily_err}")
    except GeminiRateLimitError as rate_err:
        raise HTTPException(status_code=429, detail=f"Google Gemini temporary rate limit (15 RPM): {rate_err}")
    except GeminiQuotaExceededError as quota_err:
        raise HTTPException(status_code=429, detail=str(quota_err))
    except GeminiAuthError as auth_err:
        raise HTTPException(status_code=401, detail=str(auth_err))
    except GeminiModelConfigError as model_err:
        raise HTTPException(status_code=400, detail=str(model_err))
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(err)}")

@app.post("/api/summarize", response_model=SummarizeResponse, summary="Generate Executive Summary & Key Takeaways")
def summarize(request: SummarizeRequest):
    if not settings.has_groq_key:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is not configured in backend/.env.")

    try:
        summary, takeaways, sources = rag_engine.summarize(
            filename=request.filename,
            format_type=request.format_type
        )
        return SummarizeResponse(
            summary=summary,
            key_takeaways=takeaways,
            sources=sources
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Summarization error: {str(err)}")

@app.post("/api/compare", response_model=CompareResponse, summary="Compare Multiple PDF Documents")
def compare_docs(request: CompareRequest):
    if not settings.has_groq_key:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is not configured in backend/.env.")

    try:
        comp, sims, diffs, sources = rag_engine.compare_documents(request.filenames)
        return CompareResponse(
            comparison=comp,
            similarities=sims,
            differences=diffs,
            sources=sources
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Comparison error: {str(err)}")

@app.post("/api/study-mode", response_model=StudyModeResponse, summary="Generate Revision Notes, Flashcards & Quiz")
def study_mode(request: StudyModeRequest):
    if not settings.has_groq_key:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY is not configured in backend/.env.")

    try:
        notes, flashcards, quiz = rag_engine.study_mode(
            topic=request.topic,
            num_questions=request.num_questions
        )
        return StudyModeResponse(
            study_notes=notes,
            flashcards=flashcards,
            quiz=quiz
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Study mode error: {str(err)}")

@app.post("/api/feedback", response_model=FeedbackResponse, summary="Submit Answer Rating / Feedback")
def submit_feedback(request: FeedbackRequest):
    success = rag_engine.record_feedback(
        session_id=request.session_id,
        message_index=request.message_index,
        feedback=request.feedback,
        comment=request.comment
    )
    return FeedbackResponse(
        status="success" if success else "error",
        message="Thank you for your feedback! It helps improve answer quality."
    )

@app.get("/api/history", response_model=List[ChatMessage], summary="Get Conversation History")
def get_history(session_id: str = Query(default="default")):
    raw_history = rag_engine.get_history(session_id)
    messages = []
    for item in raw_history:
        messages.append(ChatMessage(
            role="user",
            content=item.get("user", ""),
            timestamp=item.get("timestamp")
        ))
        messages.append(ChatMessage(
            role="assistant",
            content=item.get("assistant", ""),
            sources=[SourceCitation(**s) for s in item.get("sources", [])],
            timestamp=item.get("timestamp"),
            feedback=item.get("feedback")
        ))
    return messages

@app.post("/api/history/clear", response_model=ClearResponse, summary="Clear Conversation History Only")
def clear_history_only(session_id: str = Query(default="default")):
    rag_engine.clear_history_only(session_id)
    return ClearResponse(
        message=f"Conversation history for session '{session_id}' cleared. Indexed documents preserved.",
        session_id=session_id
    )

@app.post("/api/clear", response_model=ClearResponse, summary="Wipe Vector Store and All Documents")
def clear_all(session_id: Optional[str] = Query(default=None)):
    rag_engine.clear(session_id)
    return ClearResponse(
        message="All uploaded documents, vector store, and conversations have been reset.",
        session_id=session_id or "all"
    )
