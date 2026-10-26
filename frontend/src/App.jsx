import React, { useState, useEffect } from 'react';
import { apiService } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ChatComposer } from './components/ChatComposer';
import { SummaryView } from './components/SummaryView';
import { StudyModeView } from './components/StudyModeView';
import { CompareView } from './components/CompareView';

export const App = () => {
  const [activeMode, setActiveMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sessionId = 'default';

  const refreshStatus = async () => {
    try {
      const data = await apiService.getStatus();
      setSystemStatus(data);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const history = await apiService.getHistory(sessionId);
      if (history && history.length > 0) {
        setMessages(history);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    refreshStatus();
    loadHistory();
  }, []);

  const handleSendMessage = async (questionText) => {
    if (!questionText.trim()) return;

    // Optimistic User message
    const userMsg = { role: 'user', content: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await apiService.askQuestion(questionText, sessionId);
      const botMsg = {
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ ${err.message || 'An error occurred while communicating with DocuMind AI.'}`,
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      refreshStatus();
    }
  };

  const handleFeedback = async (messageIndex, feedbackType) => {
    // Update local state first
    setMessages((prev) =>
      prev.map((msg, idx) => (idx === messageIndex ? { ...msg, feedback: feedbackType } : msg))
    );
    try {
      await apiService.submitFeedback(sessionId, messageIndex, feedbackType);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const handleNewConversation = async () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear conversation history? Your uploaded documents will remain indexed.')) {
      try {
        await apiService.clearHistoryOnly(sessionId);
        setMessages([]);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDeleteDocument = async (filename) => {
    if (window.confirm(`Remove '${filename}' and update vector index?`)) {
      try {
        await apiService.deleteDocument(filename);
        await refreshStatus();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleWipeAll = async () => {
    if (window.confirm('Wipe ALL uploaded documents and reset the entire knowledge base?')) {
      try {
        await apiService.clearAll();
        setMessages([]);
        await refreshStatus();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    let markdown = `# DocuMind AI — Conversation Export\n\n`;
    markdown += `**Export Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**Documents in Knowledge Base:** ${systemStatus?.indexed_files?.join(', ') || 'None'}\n\n---\n\n`;

    messages.forEach((m, idx) => {
      const sender = m.role === 'user' ? '### User' : '### DocuMind AI Assistant';
      markdown += `${sender}\n\n${m.content}\n\n`;
      if (m.sources && m.sources.length > 0) {
        markdown += `*Sources Cited:*\n`;
        m.sources.forEach((s) => {
          markdown += `- **${s.source}** (Page ${s.page})\n`;
        });
        markdown += `\n`;
      }
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DocuMind_Conversation_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const documents = systemStatus?.documents || [];
  const hasDocuments = (systemStatus?.total_chunks || 0) > 0;

  return (
    <div className="app-container">
      {/* Document Management Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        systemStatus={systemStatus}
        onUploadSuccess={refreshStatus}
        onDeleteDocument={handleDeleteDocument}
        onWipeAll={handleWipeAll}
      />

      {/* Main Workspace Area */}
      <main className="main-chat">
        <Header
          activeMode={activeMode}
          onModeChange={setActiveMode}
          systemStatus={systemStatus}
          onNewConversation={handleNewConversation}
          onExportChat={handleExportChat}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          hasMessages={messages.length > 0}
        />

        {/* Dynamic Mode Switcher Views */}
        {activeMode === 'chat' && (
          <>
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onSelectSuggested={handleSendMessage}
              hasDocuments={hasDocuments}
              onOpenUpload={() => setSidebarOpen(true)}
            />
            <ChatComposer
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={!hasDocuments}
              placeholder={
                !hasDocuments
                  ? "Upload PDF documents to begin conversational QA..."
                  : "Ask a question (e.g. 'What are the main findings and conclusions?')..."
              }
            />
          </>
        )}

        {activeMode === 'summary' && (
          <SummaryView
            documents={documents}
            hasDocuments={hasDocuments}
            onOpenUpload={() => setSidebarOpen(true)}
          />
        )}

        {activeMode === 'study' && (
          <StudyModeView
            hasDocuments={hasDocuments}
            onOpenUpload={() => setSidebarOpen(true)}
          />
        )}

        {activeMode === 'compare' && (
          <CompareView
            documents={documents}
            onOpenUpload={() => setSidebarOpen(true)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
