import React, { useState } from 'react';
import { GraduationCap, Sparkles, HelpCircle, Check, X, RotateCw, Loader2, BookOpen } from 'lucide-react';
import { marked } from 'marked';
import { apiService } from '../services/api';
import { MarkdownText } from './MarkdownText';

export const StudyModeView = ({ hasDocuments, onOpenUpload }) => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [studyPack, setStudyPack] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setFlippedCards({});
    setQuizAnswers({});
    try {
      const data = await apiService.studyMode(topic || null, numQuestions);
      setStudyPack(data);
    } catch (err) {
      setError(err.message || 'Failed to generate study materials');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlip = (index) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const selectQuizOption = (qIdx, opt) => {
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: opt }));
  };

  if (!hasDocuments) {
    return (
      <div className="feature-view-container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <GraduationCap size={48} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '8px' }}>
          No Documents Available for Study Mode
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
          Please upload your syllabus or study material PDFs to generate revision packs, active recall flashcards, and quizzes.
        </p>
        <button type="button" className="btn-primary" onClick={onOpenUpload} style={{ margin: '0 auto' }}>
          Upload Materials
        </button>
      </div>
    );
  }

  return (
    <div className="feature-view-container">
      <div className="feature-view-header">
        <div>
          <h2>Interactive Study & Revision Pack</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Generate grounded revision notes, active recall flashcards, and practice quizzes.
          </span>
        </div>
      </div>

      {/* Control Box */}
      <div className="stats-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              Focus Topic (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Shor's Algorithm or Betz's Law"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
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
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>
              Practice Questions
            </label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
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
              <option value={3}>3 Practice Questions</option>
              <option value={5}>5 Practice Questions</option>
              <option value={8}>8 Practice Questions</option>
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
                <span>Building Study Pack...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Study Pack</span>
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

      {/* Render Study Pack Content */}
      {studyPack && (
        <>
          {/* 1. Revision Notes */}
          <div className="stats-card">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <BookOpen size={18} color="var(--accent-primary)" />
              <span>Core Revision Notes</span>
            </h3>
            <div 
              className="markdown-body" 
              dangerouslySetInnerHTML={{ __html: marked.parse(studyPack.study_notes || '') }} 
            />
          </div>

          {/* 2. Active Recall Flashcards */}
          {studyPack.flashcards && studyPack.flashcards.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Active Recall Flashcards (Click to flip)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Test your conceptual recall before viewing the verified answers.
              </span>

              <div className="flashcards-grid">
                {studyPack.flashcards.map((fc, idx) => {
                  const isFlipped = !!flippedCards[idx];
                  return (
                    <div key={idx} className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => toggleFlip(idx)}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className={`fc-state-badge ${isFlipped ? 'badge-back' : 'badge-front'}`}>
                            {isFlipped ? 'Answer & Explanation' : 'Concept / Question'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <RotateCw size={12} />
                            <span>Click to flip</span>
                          </span>
                        </div>
                        {isFlipped ? (
                          <div className="flashcard-back">
                            <MarkdownText text={fc.back} inline={false} />
                          </div>
                        ) : (
                          <div className="flashcard-front">
                            <MarkdownText text={fc.front} inline={true} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                        Source: {fc.source_hint || 'PDF Context'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Practice Quiz */}
          {studyPack.quiz && studyPack.quiz.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Practice Multiple-Choice Quiz
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {studyPack.quiz.map((q, qIdx) => {
                  const selected = quizAnswers[qIdx];
                  const hasAnswered = !!selected;

                  return (
                    <div key={qIdx} className="quiz-card">
                      <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {qIdx + 1}. <MarkdownText text={q.question} inline={true} />
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correct_answer && opt.toLowerCase().startsWith(q.correct_answer.slice(0, 1).toLowerCase());
                          const isSelected = selected === opt;

                          let optClass = 'quiz-option';
                          if (hasAnswered) {
                            if (isCorrect) optClass += ' selected-correct';
                            else if (isSelected) optClass += ' selected-wrong';
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              className={optClass}
                              onClick={() => !hasAnswered && selectQuizOption(qIdx, opt)}
                              disabled={hasAnswered}
                              style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                            >
                              <span style={{ flex: 1 }}>
                                <MarkdownText text={opt} inline={true} />
                              </span>
                              {hasAnswered && isCorrect && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-success)', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                  <Check size={16} />
                                  <span>Correct</span>
                                </span>
                              )}
                              {hasAnswered && isSelected && !isCorrect && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-error)', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                  <X size={16} />
                                  <span>Your choice</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div style={{ marginTop: '6px', padding: '10px 14px', background: 'var(--accent-primary-light)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--accent-primary)' }}>Explanation:</strong> <MarkdownText text={q.explanation} inline={true} /> {q.source && <span style={{ color: 'var(--text-muted)' }}>({q.source})</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
