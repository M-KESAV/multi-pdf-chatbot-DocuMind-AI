import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const FileUpload = ({ onUploadSuccess, systemStatus }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelection = (newFiles) => {
    setErrorMessage(null);
    setStatusMessage(null);
    const filesArray = Array.from(newFiles);

    // Validate .pdf extension
    const validPdfs = filesArray.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (validPdfs.length < filesArray.length) {
      setErrorMessage('Non-PDF files were omitted. DocuMind only processes .pdf documents.');
    }

    // Validate size limit (50MB)
    const oversized = validPdfs.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setErrorMessage(`Oversized files omitted (50MB max): ${oversized.map((f) => f.name).join(', ')}`);
    }

    const eligible = validPdfs.filter((f) => f.size <= MAX_FILE_SIZE);

    // Deduplicate by filename
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((p) => p.name));
      const additions = eligible.filter((f) => !existingNames.has(f.name));
      return [...prev, ...additions];
    });
  };

  const removeFile = (nameToRemove) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== nameToRemove));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  const handleUploadAndProcess = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await apiService.uploadPDFs(selectedFiles);
      setStatusMessage(res.message);
      setSelectedFiles([]);
      if (onUploadSuccess) {
        onUploadSuccess(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing PDFs');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-card">
      <div 
        className={`drop-zone ${isDragging ? 'dragover' : ''}`}
        tabIndex={0}
        role="button"
        aria-label="Upload PDF documents"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          multiple 
          accept=".pdf,application/pdf"
          onChange={(e) => {
            if (e.target.files) handleFileSelection(e.target.files);
          }}
        />
        <div className="drop-icon-wrapper">
          <UploadCloud size={22} />
        </div>
        <p className="drop-title">Drop PDF documents here</p>
        <span className="drop-sub">or click to browse from device (up to 50MB)</span>
      </div>

      {/* Selected file queue */}
      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            QUEUE ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
          </span>
          <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {selectedFiles.map((file) => (
              <div key={file.name} className="doc-card" style={{ padding: '6px 10px' }}>
                <div className="doc-card-info">
                  <FileText size={15} color="var(--accent-primary)" />
                  <span className="doc-card-name" style={{ fontSize: '0.78rem', maxWidth: '170px' }} title={file.name}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button 
                  type="button"
                  className="doc-delete-btn" 
                  onClick={() => removeFile(file.name)}
                  title="Remove from queue"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button 
        type="button"
        className="btn-primary" 
        style={{ width: '100%', marginTop: '12px' }}
        onClick={handleUploadAndProcess}
        disabled={selectedFiles.length === 0 || isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Embedding & Indexing...</span>
          </>
        ) : (
          <span>Process {selectedFiles.length > 0 ? `${selectedFiles.length} Document(s)` : 'PDFs'}</span>
        )}
      </button>

      {/* Status or Error Notifications */}
      {statusMessage && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.76rem', color: 'var(--status-success)' }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          marginTop: '10px',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
          fontSize: '0.78rem',
          lineHeight: '1.45',
          color: '#991B1B',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          padding: '9px 12px',
          borderRadius: '8px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#DC2626' }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
