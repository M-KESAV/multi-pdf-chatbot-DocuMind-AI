import React, { useState } from 'react';
import { GitCompare, Sparkles, CheckCircle2, Bookmark, AlertCircle, Loader2 } from 'lucide-react';
import { marked } from 'marked';
import { apiService } from '../services/api';
import { SourceCard } from './SourceCard';
import { MarkdownText } from './MarkdownText';

export const CompareView = ({ documents, onOpenUpload }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canCompare = documents && documents.length >= 2;

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.compare();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCompare) {
    return (
      <div className="feature-view-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <GitCompare size={48} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '8px' }}>
          At Least 2 Documents Required for Comparison
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px', maxWidth: '440px', margin: '0 auto 16px auto' }}>
          Document Comparison analyzes cross-document themes, conflicting statements, and methodology differences across multiple PDFs.
        </p>
        <button type="button" className="btn-primary" onClick={onOpenUpload} style={{ margin: '0 auto' }}>
          Upload Additional Documents
        </button>
      </div>
    );
  }

  return (
    <div className="feature-view-container">
      <div className="feature-view-header">
        <div>
          <h2>Multi-Document Comparative Analysis</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Compare and contrast findings, methodologies, and points of agreement across {documents.length} documents.
          </span>
        </div>
      </div>

      <div className="stats-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Documents in Scope
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {documents.map((d) => (
                <span key={d.filename} className="citation-chip" style={{ cursor: 'default' }}>
                  {d.filename} ({d.pages} pages)
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleCompare}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Comparing Documents...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Execute Comparison</span>
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

      {result && (
        <>
          <div className="stats-card">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Domain & Scope Comparison
            </h3>
            <div 
              className="markdown-body" 
              dangerouslySetInnerHTML={{ __html: marked.parse(result.comparison || '') }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Similarities Card */}
            <div className="stats-card" style={{ borderTop: '3px solid var(--status-success)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.96rem', color: 'var(--status-success)', marginBottom: '10px' }}>
                Key Similarities & Overlaps
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.similarities && result.similarities.length > 0 ? (
                  result.similarities.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                      <CheckCircle2 size={14} color="var(--status-success)" style={{ flexShrink: 0, marginTop: '3px' }} />
                      <MarkdownText text={item} inline={true} />
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No major direct overlaps detected.</span>
                )}
              </div>
            </div>

            {/* Differences Card */}
            <div className="stats-card" style={{ borderTop: '3px solid var(--accent-primary)' }}>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.96rem', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '10px' }}>
                Contrasting Methodologies & Differences
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.differences && result.differences.length > 0 ? (
                  result.differences.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 700, flexShrink: 0 }}>&bull;</span>
                      <MarkdownText text={item} inline={true} />
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Independent domain coverage.</span>
                )}
              </div>
            </div>
          </div>

          {result.sources && result.sources.length > 0 && (
            <div className="sources-container">
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
        </>
      )}
    </div>
  );
};
