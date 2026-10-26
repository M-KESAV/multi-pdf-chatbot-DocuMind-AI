import React, { useState } from 'react';
import { User, Copy, Check, Bookmark, ThumbsUp, ThumbsDown } from 'lucide-react';
import { marked } from 'marked';
import { DocuMindIcon } from './DocuMindIcon';
import { SourceCard } from './SourceCard';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MessageBubble = ({ message, index, onFeedback }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe HTML from marked
  const renderedHtml = !isUser ? marked.parse(message.content || '') : '';

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}>
        {isUser ? <User size={17} /> : <DocuMindIcon size={20} />}
      </div>

      <div className="message-bubble">
        {isUser ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        ) : (
          <div 
            className="markdown-body" 
            dangerouslySetInnerHTML={{ __html: renderedHtml }} 
          />
        )}

        {/* Source Citations when provided */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="sources-container">
            <div className="sources-header">
              <Bookmark size={12} color="var(--accent-primary)" />
              <span>Verified Sources ({message.sources.length} citations)</span>
            </div>
            <div className="citation-chips">
              {message.sources.map((cit, idx) => (
                <SourceCard key={`${cit.source}-${cit.page}-${idx}`} citation={cit} />
              ))}
            </div>
          </div>
        )}

        {/* Action Toolbar for Assistant Response */}
        {!isUser && (
          <div className="msg-actions-toolbar">
            <div className="feedback-group">
              <button
                type="button"
                className={`feedback-btn ${message.feedback === 'helpful' ? 'active-helpful' : ''}`}
                onClick={() => onFeedback && onFeedback(index, 'helpful')}
                title="Mark this answer as helpful"
              >
                <ThumbsUp size={13} />
                <span>Helpful</span>
              </button>

              <button
                type="button"
                className={`feedback-btn ${message.feedback === 'unhelpful' ? 'active-unhelpful' : ''}`}
                onClick={() => onFeedback && onFeedback(index, 'unhelpful')}
                title="Report issue with answer"
              >
                <ThumbsDown size={13} />
              </button>
            </div>

            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '3px 8px', fontSize: '0.74rem', gap: '4px' }}
              onClick={handleCopy}
              title="Copy answer markdown to clipboard"
            >
              {copied ? <Check size={13} color="var(--status-success)" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
