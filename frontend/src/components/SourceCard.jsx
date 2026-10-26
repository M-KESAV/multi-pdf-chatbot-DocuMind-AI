import React, { useState } from 'react';
import { FileText, X, BookOpen, Quote } from 'lucide-react';

export const SourceCard = ({ citation }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button"
        className="citation-chip" 
        onClick={() => setIsOpen(true)}
        title={`View context excerpt from ${citation.source} (Page ${citation.page})`}
      >
        <FileText size={12} />
        <span className="file-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {citation.source}
        </span>
        <span className="page-badge">p. {citation.page}</span>
      </button>

      {isOpen && (
        <div className="snippet-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="snippet-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.96rem', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <BookOpen size={17} color="var(--accent-primary)" />
                <span>{citation.source} &bull; Page {citation.page}</span>
              </h4>
              <button 
                type="button"
                className="btn-ghost" 
                onClick={() => setIsOpen(false)}
                title="Close excerpt preview"
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Quote size={12} />
              <span>Verified PDF Chunk Excerpt</span>
            </p>

            <div className="snippet-body">
              {citation.snippet}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn-secondary" 
                onClick={() => setIsOpen(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
