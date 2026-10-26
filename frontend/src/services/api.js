/**
 * DocuMind AI — API Client Service
 * Centralized service connecting React frontend to the FastAPI RAG backend.
 */

// Read base URL from Vite environment variable (e.g. VITE_API_BASE_URL=http://localhost:8000)
// If unset or empty, defaults to '/api' which Vite proxies to localhost:8000 during local dev
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = RAW_BASE ? `${RAW_BASE.replace(/\/+$/, '')}/api` : '/api';

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

export const apiService = {
  /**
   * Health check
   */
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend server is unreachable');
    return res.json();
  },

  /**
   * Retrieve current system status, active models, and indexed knowledge overview
   */
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to retrieve system status');
    return res.json();
  },

  /**
   * Retrieve list of indexed documents with page/chunk counts and timestamps
   */
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to retrieve document list');
    return res.json();
  },

  /**
   * Remove a specific document from the knowledge base and update vector store
   */
  async deleteDocument(filename) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, `Failed to remove '${filename}'`));
    }
    return data;
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, 'Failed to process PDFs'));
    }
    return data;
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, 'Error generating answer'));
    }
    return data;
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, 'Failed to generate summary'));
    }
    return data;
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, 'Failed to generate comparison'));
    }
    return data;
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(parseErrorMessage(data, 'Failed to generate study materials'));
    }
    return data;
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
    return res.json();
  },

  /**
   * Retrieve conversation history for current session
   */
  async getHistory(sessionId = 'default') {
    const res = await fetch(`${API_BASE}/history?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  /**
   * Clear only conversational history for current session (keeps documents intact)
   */
  async clearHistoryOnly(sessionId = 'default') {
    const res = await fetch(`${API_BASE}/history/clear?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to clear conversation history');
    return res.json();
  },

  /**
   * Reset all documents, vector store, and conversations
   */
  async clearAll() {
    const res = await fetch(`${API_BASE}/clear`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset knowledge base');
    return res.json();
  },
};
