import React from 'react';
import { 
  MessageSquare, 
  FileText, 
  GraduationCap, 
  GitCompare, 
  RotateCcw, 
  Download, 
  Menu, 
  Cpu, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { DocuMindIcon } from './DocuMindIcon';

export const Header = ({ 
  activeMode, 
  onModeChange, 
  systemStatus, 
  onNewConversation, 
  onExportChat, 
  onToggleSidebar, 
  hasMessages 
}) => {
  const isReady = systemStatus?.status === 'ready';
  const hasKeys = systemStatus?.has_google_key && systemStatus?.has_groq_key;

  return (
    <header className="chat-navbar">
      <div className="navbar-left">
        {/* Mobile Sidebar Toggle */}
        <button 
          type="button" 
          className="btn-ghost" 
          onClick={onToggleSidebar} 
          title="Toggle Documents Drawer"
          aria-label="Toggle Documents Drawer"
        >
          <Menu size={20} />
        </button>

        {/* Brand identity on Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DocuMindIcon size={26} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            DocuMind AI
          </span>
        </div>

        {/* Workspace Mode Switcher */}
        <nav className="mode-tabs" aria-label="Workspace Modes">
          <button 
            type="button"
            className={`mode-tab ${activeMode === 'chat' ? 'active' : ''}`}
            onClick={() => onModeChange('chat')}
            title="Interactive Multi-PDF QA Chat"
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>

          <button 
            type="button"
            className={`mode-tab ${activeMode === 'summary' ? 'active' : ''}`}
            onClick={() => onModeChange('summary')}
            title="Generate Executive Document Summary"
          >
            <FileText size={14} />
            <span>Summary</span>
          </button>

          <button 
            type="button"
            className={`mode-tab ${activeMode === 'study' ? 'active' : ''}`}
            onClick={() => onModeChange('study')}
            title="Generate Study Notes & Flashcards"
          >
            <GraduationCap size={14} />
            <span>Study Mode</span>
          </button>

          <button 
            type="button"
            className={`mode-tab ${activeMode === 'compare' ? 'active' : ''}`}
            onClick={() => onModeChange('compare')}
            title="Compare Multiple Documents"
          >
            <GitCompare size={14} />
            <span>Compare</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Groq Model Tag */}
        {systemStatus?.groq_model && (
          <span className="model-tag" title="Active Groq LLM">
            <Cpu size={12} />
            <span>{systemStatus.groq_model}</span>
          </span>
        )}

        {/* Backend Status Pill */}
        {systemStatus === null ? (
          <div className="status-pill warning" title="Connecting to DocuMind backend...">
            <span className="status-dot"></span>
            <span>Connecting...</span>
          </div>
        ) : hasKeys ? (
          isReady ? (
            <div className="status-pill ready" title="Vector store indexed and live">
              <span className="status-dot"></span>
              <span>Online</span>
            </div>
          ) : (
            <div className="status-pill awaiting" title="Upload PDFs to begin">
              <span className="status-dot"></span>
              <span>Awaiting PDFs</span>
            </div>
          )
        ) : (
          <div className="status-pill warning" title="Configure keys in backend/.env">
            <AlertCircle size={13} />
            <span>Keys Needed</span>
          </div>
        )}

        {/* Export Chat Button (only active if messages exist) */}
        {hasMessages && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onExportChat}
            title="Export conversation as Markdown"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        )}

        {/* New Conversation Button */}
        <button
          type="button"
          className="btn-secondary"
          onClick={onNewConversation}
          title="Start a new chat (clears conversation history)"
        >
          <RotateCcw size={13} />
          <span>New Chat</span>
        </button>
      </div>
    </header>
  );
};
