import React, { useEffect, useRef } from 'react';
import { 
  Sparkles, 
  FileSearch, 
  Layers, 
  MessageSquareQuote, 
  UploadCloud, 
  ArrowRight 
} from 'lucide-react';
import { DocuMindIcon } from './DocuMindIcon';
import { MessageBubble } from './MessageBubble';

export const ChatWindow = ({ 
  messages, 
  isLoading, 
  onSelectSuggested, 
  hasDocuments, 
  onOpenUpload 
}) => {
  const scrollEndRef = useRef(null);

  const scrollToBottom = () => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sampleQuestions = [
    "What are the core arguments and conclusions across these documents?",
    "Explain any specific laws, formulas, or theorems cited.",
    "Are there any conflicting findings or recommendations mentioned?",
  ];

  return (
    <div className="messages-container">
      {messages.length === 0 ? (
        <div className="welcome-screen">
          <div className="welcome-icon-glow">
            <DocuMindIcon size={34} />
          </div>
          <h2>Your knowledge, ready to explore.</h2>
          <p>
            Upload one or more PDF documents in the sidebar. DocuMind extracts page-level text, 
            preserves source citations, vectorizes with Google Gemini, and delivers grounded answers via Groq.
          </p>

          <div className="features-grid">
            <div className="feature-pill">
              <FileSearch size={20} />
              <strong>Exact Page Citations</strong>
              <span>Every claim links to verified PDF document and page</span>
            </div>
            <div className="feature-pill">
              <Layers size={20} />
              <strong>FAISS Vector Store</strong>
              <span>High-speed similarity indexing across multiple files</span>
            </div>
            <div className="feature-pill">
              <MessageSquareQuote size={20} />
              <strong>Follow-Up Memory</strong>
              <span>Retains multi-turn conversation context naturally</span>
            </div>
          </div>

          {/* Action or Suggested Inquiries */}
          {!hasDocuments ? (
            <div style={{ marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={onOpenUpload}
                style={{ padding: '12px 24px', fontSize: '0.9rem' }}
              >
                <UploadCloud size={18} />
                <span>Upload Documents to Get Started</span>
              </button>
            </div>
          ) : (
            <div className="suggested-section">
              <span>Suggested Inquiries</span>
              <div className="suggested-buttons">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn-suggested"
                    onClick={() => onSelectSuggested(q)}
                  >
                    <span>"{q}"</span>
                    <ArrowRight size={14} style={{ opacity: 0.6 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        messages.map((msg, index) => (
          <MessageBubble key={index} index={index} message={msg} />
        ))
      )}

      {/* Typing indicator */}
      {isLoading && (
        <div className="message-row assistant">
          <div className="avatar bot-avatar">
            <DocuMindIcon size={20} />
          </div>
          <div className="message-bubble typing-bubble">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        </div>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};
