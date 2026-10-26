import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';

export const ChatComposer = ({ onSendMessage, isLoading, disabled, placeholder }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="chat-composer-wrapper">
      <form className="composer-box" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask a question across your indexed PDFs..."}
          disabled={disabled || isLoading}
          className="composer-input"
          aria-label="Ask a question across your indexed PDFs"
        />

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '38px', height: '38px', padding: 0, borderRadius: 'var(--radius-md)' }}
          disabled={!input.trim() || isLoading || disabled}
          title="Send question (Enter)"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
      <span className="composer-hint">
        DocuMind AI grounds answers strictly in verified PDF context with exact page citations.
      </span>
    </div>
  );
};
