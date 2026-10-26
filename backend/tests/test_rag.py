import io
import pytest
from pypdf import PdfWriter
from fastapi.testclient import TestClient

from app.main import app
from app.config import BACKEND_DIR
from app.rag_engine import rag_engine
from app.models import SourceCitation
from langchain_core.documents import Document

client = TestClient(app)

def create_sample_pdf_bytes(title: str = "Test Doc", pages_text: list = None) -> bytes:
    """Helper to generate a clean multi-page PDF in memory."""
    if pages_text is None:
        pages_text = ["Page 1 content about Artificial Intelligence.", "Page 2 content discussing Neural Networks."]
    
    writer = PdfWriter()
    for text in pages_text:
        # Add a blank page and add annotations or basic text
        page = writer.add_blank_page(width=612, height=792)
    
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_system_status():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "has_google_key" in data
    assert "has_groq_key" in data
    assert "groq_model" in data

def test_chunking_preserves_metadata():
    docs = [
        Document(
            page_content="Artificial intelligence and machine learning are transforming modern computational workflows." * 20,
            metadata={"source": "research_paper.pdf", "page": 3}
        )
    ]
    chunks = rag_engine.chunk_documents(docs)
    assert len(chunks) > 0
    for chunk in chunks:
        assert chunk.metadata["source"] == "research_paper.pdf"
        assert chunk.metadata["page"] == 3

def test_clear_history_only():
    response = client.post("/api/history/clear?session_id=test_session")
    assert response.status_code == 200
    assert "cleared" in response.json()["message"]

def test_clear_all_session():
    response = client.post("/api/clear?session_id=test_session")
    assert response.status_code == 200
    assert "reset" in response.json()["message"]

def test_list_documents():
    response = client.get("/api/documents")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_chat_without_keys_returns_graceful_error():
    # Calling chat without indexed files must return 400 with helpful detail
    response = client.post("/api/chat", json={"question": "What is AI?", "session_id": "test"})
    assert response.status_code in [400, 404]
    assert "detail" in response.json()

def test_quota_error_handling_and_atomic_rollback():
    from app.rag_engine import GeminiQuotaExceededError
    # Save original state
    orig_embed = rag_engine._safe_batch_embed
    docs_before = len(rag_engine.get_document_list())

    def mock_exhausted(embeddings, texts):
        raise GeminiQuotaExceededError("Google Gemini Embedding API quota exceeded (HTTP 429 RESOURCE_EXHAUSTED).")

    rag_engine._safe_batch_embed = mock_exhausted
    try:
        sample_path = BACKEND_DIR.parent / "sample_pdfs" / "Quantum_Computing_Overview.pdf"
        sample_pdf = sample_path.read_bytes()
        res = client.post(
            "/api/upload",
            files={"files": ("failing_doc.pdf", sample_pdf, "application/pdf")}
        )
        assert res.status_code == 429
        assert "RESOURCE_EXHAUSTED" in res.json()["detail"]
        # Document store must not have added the failed doc
        docs_after = len(rag_engine.get_document_list())
        assert docs_after == docs_before
    finally:
        rag_engine._safe_batch_embed = orig_embed

def test_dense_reference_chunk_detection():
    from app.rag_engine import is_dense_reference_chunk
    bib_text = (
        "[1] J. Smith, Paper One, CVPR 2020.\n"
        "[2] A. Johnson, Paper Two, ECCV 2021.\n"
        "[3] B. Lee, Paper Three, NeurIPS 2022.\n"
        "[4] C. Davis, Paper Four, ICML 2023."
    )
    assert is_dense_reference_chunk(bib_text) is True

    body_text = (
        "We introduce a unified deep learning framework for real-time document intelligence. "
        "Our method achieves significant accuracy gains without extra latency."
    )
    assert is_dense_reference_chunk(body_text) is False

def test_chat_refusal_suppresses_citations():
    # If LLM produces refusal, citations should be empty
    from unittest.mock import MagicMock
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = "Answer is not available in the context."

    orig_get_llm = rag_engine._get_llm
    rag_engine._get_llm = lambda *args, **kwargs: mock_llm
    try:
        if rag_engine._vector_store is not None:
            ans, cits = rag_engine.chat("Question about unrelated topic XYZ?", session_id="test_refusal")
            assert "Answer is not available" in ans
            assert len(cits) == 0, "Citations must be empty on refusal"
    finally:
        rag_engine._get_llm = orig_get_llm

def test_summarize_structure_and_citations():
    from unittest.mock import MagicMock
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = (
        "Executive Summary Paragraph 1.\n\n"
        "Key Takeaways:\n"
        "- **Core Finding**: Quantum error correction improves coherence times significantly.\n"
        "- **Scalability**: High fidelity gates are achievable with superconducting circuits.\n"
        "- **Limitations**: Current systems are NISQ with thermal noise constraints."
    )
    orig_get_llm = rag_engine._get_llm
    rag_engine._get_llm = lambda *args, **kwargs: mock_llm
    try:
        if rag_engine._vector_store is not None:
            summary, takeaways, sources = rag_engine.summarize()
            assert len(summary) > 0
            assert len(takeaways) >= 3
            # Check that takeaways contain bold markdown formatting
            assert any("**Core Finding**" in t for t in takeaways)
            for s in sources:
                assert s.source
                assert s.page >= 1
                assert len(s.snippet) > 0
    finally:
        rag_engine._get_llm = orig_get_llm

def test_compare_documents_structure():
    from unittest.mock import MagicMock
    mock_llm = MagicMock()
    mock_llm.invoke.return_value.content = (
        "Domain & Scope Overview: The documents address quantum computing and renewable energy respectively.\n\n"
        "Similarities / Commonalities:\n"
        "- **Methodological Rigor**: Both use empirical measurement frameworks.\n"
        "- **Computational Needs**: Both require extensive numerical simulation.\n\n"
        "Differences / Contrasting Approaches:\n"
        "- **Domain Scope**: One focuses on subatomic physics while the other addresses grid-scale power.\n"
        "- **Commercial Maturity**: Clean energy is commercially deployed while fault-tolerant quantum is experimental."
    )
    orig_get_llm = rag_engine._get_llm
    rag_engine._get_llm = lambda *args, **kwargs: mock_llm
    try:
        if rag_engine._vector_store is not None and len(rag_engine._document_store) >= 2:
            overview, sims, diffs, sources = rag_engine.compare_documents()
            assert len(overview) > 0
            assert len(sims) >= 2
            assert len(diffs) >= 2
            for s in sources:
                assert s.source
                assert s.page >= 1
    finally:
        rag_engine._get_llm = orig_get_llm

def test_study_mode_output_format():
    from unittest.mock import MagicMock
    import json
    mock_llm = MagicMock()
    fake_pack = {
        "study_notes": "Quantum superposition allows qubits to represent linear combinations of |0> and |1>.",
        "flashcards": [
            {
                "front": "What is Qubit Decoherence?",
                "back": "Loss of quantum coherence caused by interaction with environmental noise.",
                "source_hint": "Quantum_Computing_Overview.pdf Page 1"
            }
        ],
        "quiz": [
            {
                "question": "Which principle allows quantum computers to evaluate multiple states simultaneously?",
                "options": ["A) Superposition", "B) Classical Bit Flip", "C) Ohm's Law", "D) Betz Limit"],
                "correct_answer": "A) Superposition",
                "explanation": "Superposition enables a quantum state to be a linear combination of basis states.",
                "source": "Quantum_Computing_Overview.pdf Page 1"
            }
        ]
    }
    mock_llm.invoke.return_value.content = json.dumps(fake_pack)
    orig_get_llm = rag_engine._get_llm
    rag_engine._get_llm = lambda *args, **kwargs: mock_llm
    try:
        if rag_engine._vector_store is not None:
            notes, flashcards, quiz = rag_engine.study_mode()
            assert "superposition" in notes.lower()
            assert len(flashcards) == 1
            assert flashcards[0].front == "What is Qubit Decoherence?"
            assert len(quiz) == 1
            assert len(quiz[0].options) == 4
            assert quiz[0].correct_answer.startswith("A)")
    finally:
        rag_engine._get_llm = orig_get_llm

def test_citation_metadata_integrity():
    cit = SourceCitation(
        source="Renewable_Energy_Report.pdf",
        page=2,
        snippet="Wind turbine capacity factor averages 35-45% offshore.",
        score=0.28
    )
    assert cit.source == "Renewable_Energy_Report.pdf"
    assert cit.page == 2
    assert "Wind turbine" in cit.snippet
    assert cit.score == 0.28

def test_upload_invalid_pdf_magic_header():
    # Attempting to upload a non-PDF file with a .pdf extension must fail with 400
    fake_pdf = b"This is not a real PDF document; it lacks the PDF header."
    res = client.post(
        "/api/upload",
        files={"files": ("malicious.pdf", fake_pdf, "application/pdf")}
    )
    assert res.status_code == 400
    assert "magic header" in res.json()["detail"].lower()

def test_cors_configuration_parsing():
    from app.config import settings
    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    assert len(origins) >= 1
    assert any("localhost" in o for o in origins)

def test_classify_gemini_error():
    from app.rag_engine import classify_gemini_error

    # 1. RPM Rate Limit
    rpm_err = Exception("429 Quota exceeded for quota metric 'Queries' and limit 'Queries per minute' of service 'generativelanguage.googleapis.com'")
    diag_rpm = classify_gemini_error(rpm_err)
    assert diag_rpm["type"] == "rpm_rate_limit"
    assert diag_rpm["is_transient"] is True

    # 2. RPD Daily Limit
    rpd_err = Exception("429 Resource has been exhausted (e.g. check quota limit 'Queries per day')")
    diag_rpd = classify_gemini_error(rpd_err)
    assert diag_rpd["type"] == "rpd_exhausted"
    assert diag_rpd["is_transient"] is False
    assert "daily embedding quota" in diag_rpd["message"]

    # 3. Auth error
    auth_err = Exception("400 API_KEY_INVALID: API key not valid. Please pass a valid API key.")
    diag_auth = classify_gemini_error(auth_err)
    assert diag_auth["type"] == "auth_error"
    assert diag_auth["is_transient"] is False

    # 4. Model error
    model_err = Exception("404 models/gemini-embedding-001 is not found for this project")
    diag_model = classify_gemini_error(model_err)
    assert diag_model["type"] == "model_error"
    assert diag_model["is_transient"] is False

def test_daily_quota_fails_fast_without_retries():
    from unittest.mock import MagicMock
    from app.rag_engine import GeminiDailyQuotaExceededError

    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.side_effect = Exception("429 RESOURCE_EXHAUSTED: Queries per day limit reached")

    with pytest.raises(GeminiDailyQuotaExceededError) as exc_info:
        rag_engine._safe_batch_embed(mock_embeddings, ["Sample chunk text to embed"])

    # Must fail immediately without retrying
    assert mock_embeddings.embed_documents.call_count == 1
    assert "daily embedding quota" in str(exc_info.value)

def test_transient_rpm_rate_limit_retries_and_succeeds():
    from unittest.mock import MagicMock

    mock_embeddings = MagicMock()
    # Fails once with transient rate limit, succeeds on second attempt
    mock_embeddings.embed_documents.side_effect = [
        Exception("429 RESOURCE_EXHAUSTED: Queries per minute reached. retry in 0.1s"),
        [[0.1, 0.2, 0.3]]
    ]

    res = rag_engine._safe_batch_embed(mock_embeddings, ["Sample chunk text to embed"])
    assert len(res) == 1
    assert res[0] == [0.1, 0.2, 0.3]
    assert mock_embeddings.embed_documents.call_count == 2

def test_idempotency_skips_embedding_identical_content():
    import hashlib
    from unittest.mock import MagicMock

    sample_path = BACKEND_DIR.parent / "sample_pdfs" / "Quantum_Computing_Overview.pdf"
    content = sample_path.read_bytes()
    content_hash = hashlib.sha256(content).hexdigest()

    # Pre-seed document store with matching hash and fake vector store
    mock_vs = MagicMock()
    orig_vs = rag_engine._vector_store
    orig_doc_store = rag_engine._document_store.copy()

    rag_engine._vector_store = mock_vs
    rag_engine._document_store["Quantum_Computing_Overview.pdf"] = {
        "pages": 2,
        "chunks": 4,
        "size_bytes": len(content),
        "uploaded_at": "2026-10-26 12:00 UTC",
        "content_hash": content_hash,
        "raw_docs": []
    }

    try:
        mock_embed = MagicMock()
        orig_safe_embed = rag_engine._safe_batch_embed
        rag_engine._safe_batch_embed = mock_embed

        res = rag_engine.process_and_index_pdfs([("Quantum_Computing_Overview.pdf", content)])
        assert res["already_indexed"] is True
        # embed was not called because content hash matched!
        assert mock_embed.call_count == 0
    finally:
        rag_engine._vector_store = orig_vs
        rag_engine._document_store = orig_doc_store
        rag_engine._safe_batch_embed = orig_safe_embed

def test_path_traversal_sanitization():
    from unittest.mock import MagicMock
    sample_path = BACKEND_DIR.parent / "sample_pdfs" / "Quantum_Computing_Overview.pdf"
    content = sample_path.read_bytes()

    orig_embed = rag_engine._safe_batch_embed
    rag_engine._safe_batch_embed = lambda emb, texts: [[0.1] * 768 for _ in texts]
    try:
        res = client.post(
            "/api/upload",
            files={"files": ("../../secret_exploit.pdf", content, "application/pdf")}
        )
        assert res.status_code == 200
        data = res.json()
        assert "secret_exploit.pdf" in data["files_processed"]
        assert "../../secret_exploit.pdf" not in data["files_processed"]
        # Clean up
        del_res = client.delete("/api/documents/secret_exploit.pdf")
        assert del_res.status_code == 200
    finally:
        rag_engine._safe_batch_embed = orig_embed

def test_parse_retry_after():
    from app.rag_engine import parse_retry_after

    # 1. From error string 'retry in 35.5s'
    err1 = Exception("ResourceExhausted: rate limit reached. Please retry in 35.5s")
    assert parse_retry_after(err1) == 35.5

    # 2. From error string 'Retry-After: 42'
    err2 = Exception("HTTP 429: Too Many Requests. Retry-After: 42")
    assert parse_retry_after(err2) == 42.0

    # 3. From error string 'please retry after 25 seconds'
    err3 = Exception("429 Too many requests, please retry after 25 seconds")
    assert parse_retry_after(err3) == 25.0

    # 4. From mock HTTP response header
    from unittest.mock import MagicMock
    err4 = Exception("Rate limit")
    mock_resp = MagicMock()
    mock_resp.headers = {"retry-after": "18.5"}
    err4.response = mock_resp
    assert parse_retry_after(err4) == 18.5

    # 5. When no Retry-After is available
    err5 = Exception("Generic connection failure")
    assert parse_retry_after(err5) is None

def test_gemini_rate_limiter_pacing():
    import time
    from app.rag_engine import GeminiRateLimiter

    # Use a high RPM for quick test (e.g. 600 RPM = 0.1s interval)
    limiter = GeminiRateLimiter(rpm=600, safety_margin=0.0)
    assert limiter.min_interval == 0.1

    t0 = time.time()
    limiter.wait_for_slot()
    limiter.wait_for_slot()
    elapsed = time.time() - t0
    # The second call must have paced at least ~0.08s
    assert elapsed >= 0.08

def test_preserve_completed_batches_across_retries():
    from unittest.mock import MagicMock
    from app.rag_engine import GeminiRateLimitError
    import hashlib

    # Create 4 sample chunks
    chunks = [f"Text chunk number {i} for caching test" for i in range(4)]
    
    # Configure batch size = 2, so chunks 0-1 are batch 1, chunks 2-3 are batch 2
    from app.config import settings
    orig_batch_size = settings.EMBEDDING_BATCH_SIZE
    orig_base_backoff = settings.EMBEDDING_BASE_BACKOFF
    settings.EMBEDDING_BATCH_SIZE = 2
    settings.EMBEDDING_BASE_BACKOFF = 0.01

    # Clean cache for this test
    orig_cache = rag_engine._chunk_vector_cache.copy()
    rag_engine._chunk_vector_cache.clear()

    mock_embeddings = MagicMock()
    # Batch 1 succeeds, Batch 2 fails with 429
    call_tracker = []
    def embed_side_effect(batch):
        call_tracker.append(batch)
        if len(call_tracker) == 1:
            return [[0.1, 0.1], [0.2, 0.2]]
        raise Exception("429 RESOURCE_EXHAUSTED: Queries per minute limit reached. retry in 0.01s")

    mock_embeddings.embed_documents.side_effect = embed_side_effect

    try:
        # First attempt: Batch 1 succeeds, Batch 2 fails after retries
        with pytest.raises(GeminiRateLimitError) as exc_info:
            rag_engine._safe_batch_embed(mock_embeddings, chunks)

        assert "preserved 2/4 chunks" in str(exc_info.value).lower()

        # Verify batch 1 chunks are now in cache
        h0 = hashlib.sha256(chunks[0].encode("utf-8")).hexdigest()
        h1 = hashlib.sha256(chunks[1].encode("utf-8")).hexdigest()
        assert h0 in rag_engine._chunk_vector_cache
        assert h1 in rag_engine._chunk_vector_cache

        # Second attempt (after user waits and retries):
        # Reset mock call count and verify only the remaining batch 2 is called
        call_tracker.clear()
        mock_embeddings.reset_mock()
        mock_embeddings.embed_documents.side_effect = lambda b: (call_tracker.append(b), [[0.3, 0.3], [0.4, 0.4]])[1]

        vectors = rag_engine._safe_batch_embed(mock_embeddings, chunks)
        assert len(vectors) == 4
        # Verify that embed_documents was ONLY called for the remaining 2 chunks (batch 2)!
        assert mock_embeddings.embed_documents.call_count == 1
        assert len(call_tracker[0]) == 2
        assert call_tracker[0] == chunks[2:4]
    finally:
        settings.EMBEDDING_BATCH_SIZE = orig_batch_size
        settings.EMBEDDING_BASE_BACKOFF = orig_base_backoff
        rag_engine._chunk_vector_cache = orig_cache

def test_progress_message_and_helpful_error_when_retries_exhausted(capsys):
    from unittest.mock import MagicMock
    from app.rag_engine import GeminiRateLimitError

    mock_embeddings = MagicMock()
    mock_embeddings.embed_documents.side_effect = Exception("429 RESOURCE_EXHAUSTED: rate limit exceeded. retry in 0.01s")

    with pytest.raises(GeminiRateLimitError) as exc_info:
        rag_engine._safe_batch_embed(mock_embeddings, ["Uncached chunk test"])

    # Check progress output in stdout
    captured = capsys.readouterr()
    assert "DocuMind RateLimit" in captured.out
    assert "Waiting" in captured.out

    # Check error message helpfulness
    err_msg = str(exc_info.value)
    assert "exceeded on batch 1/1" in err_msg
    assert "Please wait 30–60 seconds before retrying" in err_msg




