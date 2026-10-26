/**
 * DocuMind AI — API Client Service
 * Centralized service connecting React frontend to the FastAPI RAG backend.
 */

// Read base URL from Vite environment variable (e.g. VITE_API_BASE_URL=https://multi-pdf-chatbot-documind-ai.onrender.com)
// If unset or empty, defaults to '/api' which Vite proxies to localhost:8000 during local dev
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const cleanBase = RAW_BASE.replace(/\/+$/, '');
export const API_BASE = cleanBase
  ? (cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`)
  : '/api';

function parseErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (data.detail && typeof data.detail === 'object') {
    return data.detail.message || JSON.stringify(data.detail);
  }
  if (typeof data.message === 'string') return data.message;
  return fallback;
}

async function parseResponse(res, fallbackError) {
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // Non-JSON response (e.g. HTML 502/504 gateway error or empty)
  }
  if (!res.ok) {
    throw new Error(parseErrorMessage(data, fallbackError || `Server request failed with status ${res.status}`));
  }
  return data;
}

export const apiService = {
  /**
   * Health check
   */
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return parseResponse(res, 'Backend server is unreachable');
  },

  /**
   * Retrieve current system status, active models, and indexed knowledge overview
   */
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    return parseResponse(res, 'Failed to retrieve system status');
  },

  /**
   * Retrieve list of indexed documents with page/chunk counts and timestamps
   */
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`);
    return parseResponse(res, 'Failed to retrieve document list');
  },

  /**
   * Remove a specific document from the knowledge base and update vector store
   */
  async deleteDocument(filename) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return parseResponse(res, `Failed to remove '${filename}'`);
  },

  /**
   * Upload multiple PDF files for text extraction, chunking, and embedding
   */
  async uploadPDFs(files) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    return parseResponse(res, 'Failed to process PDFs');
  },

  /**
   * Ask conversational question across the indexed PDFs with source citations
   */
  async askQuestion(question, sessionId = 'default', topK = 4) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        session_id: sessionId,
        top_k: topK,
      }),
    });

    return parseResponse(res, 'Error generating answer');
  },

  /**
   * Generate an executive summary and key takeaways from documents
   */
  async summarize(filename = null, formatType = 'executive') {
    const res = await fetch(`${API_BASE}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: filename || null,
        format_type: formatType,
      }),
    });

    return parseResponse(res, 'Failed to generate summary');
  },

  /**
   * Compare multiple documents highlighting similarities and differences
   */
  async compare(filenames = null) {
    const res = await fetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    });

    return parseResponse(res, 'Failed to generate comparison');
  },

  /**
   * Generate revision notes, active recall flashcards, and practice quiz
   */
  async studyMode(topic = null, numQuestions = 5) {
    const res = await fetch(`${API_BASE}/study-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic || null,
        num_questions: numQuestions,
      }),
    });

    return parseResponse(res, 'Failed to generate study materials');
  },

  /**
   * Submit helpful/unhelpful rating on an assistant answer
   */
  async submitFeedback(sessionId, messageIndex, feedback, comment = null) {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message_index: messageIndex,
        feedback,
        comment,
      }),
    });
    return parseResponse(res, 'Failed to submit feedback');
  },

  /**
   * Retrieve conversation history for current session
   */
  async getHistory(sessionId = 'default') {
    const res = await fetch(`${API_BASE}/history?session_id=${encodeURIComponent(sessionId)}`);
    return parseResponse(res, 'Failed to fetch chat history');
  },

  /**
   * Clear only conversational history for current session (keeps documents intact)
   */
  async clearHistoryOnly(sessionId = 'default') {
    const res = await fetch(`${API_BASE}/history/clear?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
    });
    return parseResponse(res, 'Failed to clear conversation history');
  },

  /**
   * Reset all documents, vector store, and conversations
   */
  async clearAll() {
    const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
    return parseResponse(res, 'Failed to reset knowledge base');
  },
};
