import React, { useState } from 'react';
import { 
  FileText, 
  Trash2, 
  Search, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  X, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { DocuMindIcon } from './DocuMindIcon';
import { FileUpload } from './FileUpload';

export const Sidebar = ({ 
  isOpen, 
  onClose, 
  systemStatus, 
  onUploadSuccess, 
  onDeleteDocument, 
  onWipeAll 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const documents = systemStatus?.documents || [];
  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const hasDocuments = documents.length > 0;
  const hasKeys = systemStatus?.has_google_key && systemStatus?.has_groq_key;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="mobile-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="brand-wrapper">
            <DocuMindIcon size={32} />
            <div className="brand-info">
              <h1>DocuMind AI</h1>
              <span>Document Intelligence</span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={onClose} 
            style={{ display: isOpen ? 'flex' : 'none' }}
            title="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-body">
          {/* Upload Component */}
          <FileUpload 
            onUploadSuccess={onUploadSuccess} 
            systemStatus={systemStatus} 
          />

          {/* Documents Section Header & Search */}
          <div style={{ marginTop: '4px' }}>
            <div className="documents-section-title">
              <span>Your Documents ({documents.length})</span>
            </div>

            {hasDocuments && (
              <div className="doc-search-bar">
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Active Documents List */}
          <div className="document-list">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => (
                <div key={doc.filename} className="doc-card">
                  <div className="doc-card-info">
                    <FileText size={18} className="doc-card-icon" />
                    <div className="doc-card-details">
                      <span className="doc-card-name" title={doc.filename}>
                        {doc.filename}
                      </span>
                      <span className="doc-card-meta">
                        <span>{doc.pages} pg</span> &bull; 
                        <span>{doc.chunks} chk</span> &bull; 
                        <span>{formatFileSize(doc.size_bytes)}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="doc-delete-btn"
                    onClick={() => onDeleteDocument(doc.filename)}
                    title={`Remove '${doc.filename}'`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : hasDocuments && searchQuery ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                No documents match "{searchQuery}"
              </p>
            ) : (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <FolderOpen size={24} style={{ margin: '0 auto 6px auto', display: 'block', opacity: 0.5 }} />
                <span style={{ fontSize: '0.78rem' }}>No PDFs uploaded yet</span>
              </div>
            )}
          </div>

          {/* Knowledge & Vector Stats Card */}
          <div className="stats-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Indexed Knowledge
              </span>
              <span className={`status-pill ${hasDocuments ? 'ready' : 'awaiting'}`}>
                {hasDocuments ? `${systemStatus?.total_chunks || 0} chunks` : 'Empty'}
              </span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Documents</div>
                <div className="stat-val">{documents.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Vector Chunks</div>
                <div className="stat-val">{systemStatus?.total_chunks || 0}</div>
              </div>
            </div>

            {/* Backend Connectivity Status */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  PROVIDER STATUS
                </span>
                <Key size={13} color="var(--text-muted)" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gemini Embeddings</span>
                  {systemStatus?.has_google_key ? (
                    <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span style={{ color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> Missing
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Groq LLM</span>
                  {systemStatus?.has_groq_key ? (
                    <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span style={{ color: 'var(--status-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> Missing
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Wipe All Knowledge Base Action */}
            {hasDocuments && (
              <button
                type="button"
                className="btn-ghost"
                onClick={onWipeAll}
                style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', width: '100%', justifyContent: 'center' }}
                title="Wipe all uploaded documents and reset FAISS index"
              >
                <Trash2 size={12} style={{ marginRight: '4px' }} />
                <span>Reset All Documents</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
