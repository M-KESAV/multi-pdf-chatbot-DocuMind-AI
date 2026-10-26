import React, { useState } from 'react';
import { FileText, Sparkles, CheckCircle2, Bookmark, Loader2 } from 'lucide-react';
import { marked } from 'marked';
import { apiService } from '../services/api';
import { SourceCard } from './SourceCard';
import { MarkdownText } from './MarkdownText';

export const SummaryView = ({ documents, hasDocuments, onOpenUpload }) => {
  const [selectedDoc, setSelectedDoc] = useState('');
  const [formatType, setFormatType] = useState('executive');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.summarize(selectedDoc || null, formatType);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to synthesize summary');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasDocuments) {
    return (
      <div className="feature-view-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <FileText size={48} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '8px' }}>
          No Documents Available for Summarization
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
          Please upload one or more PDF files in the sidebar to generate executive summaries.
        </p>
        <button type="button" className="btn-primary" onClick={onOpenUpload} style={{ margin: '0 auto' }}>
          Upload Documents
        </button>
      </div>
    );
  }

  return (
    <div className="feature-view-container">
      <div className="feature-view-header">
        <div>
          <h2>Executive Document Summarizer</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Synthesize key takeaways, core findings, and structured summaries from your PDFs.
          </span>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="stats-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              Target Document
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="">All Uploaded Documents (Comprehensive)</option>
              {documents.map((d) => (
                <option key={d.filename} value={d.filename}>
                  {d.filename} ({d.pages} pages)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              Summary Format
            </label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="executive">Executive Briefing (High-Impact)</option>
              <option value="bullet_points">Bulleted Key Takeaways</option>
              <option value="detailed">In-Depth Synthesis</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Synthesizing Summary...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--status-error)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Render Summary Result */}
      {result && (
        <div className="message-bubble" style={{ background: 'var(--surface-primary)', border: '1px solid var(--border-subtle)', maxWidth: '100%' }}>
          <div 
            className="markdown-body" 
            dangerouslySetInnerHTML={{ __html: marked.parse(result.summary) }} 
          />

          {result.key_takeaways && result.key_takeaways.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.98rem', marginBottom: '10px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                Key Takeaways
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.key_takeaways.map((point, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <CheckCircle2 size={15} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '3px' }} />
                    <MarkdownText text={point} inline={true} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.sources && result.sources.length > 0 && (
            <div className="sources-container" style={{ marginTop: '20px' }}>
              <div className="sources-header">
                <Bookmark size={12} color="var(--accent-primary)" />
                <span>Supporting Source Citations</span>
              </div>
              <div className="citation-chips">
                {result.sources.map((cit, idx) => (
                  <SourceCard key={idx} citation={cit} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
