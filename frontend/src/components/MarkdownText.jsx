import React from 'react';
import { marked } from 'marked';

// Configure marked for clean inline and block rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * MarkdownText component renders Markdown strings into formatted HTML elements.
 * Supports inline rendering (parsing bold **text**, *italics*, `code`) or full block paragraphs.
 */
export const MarkdownText = ({ text, inline = true, className = '' }) => {
  if (!text) return null;

  try {
    if (inline) {
      // Use marked.parseInline to render strong, em, code without wrapping in <p>
      const parsedHtml = marked.parseInline(String(text));
      return (
        <span 
          className={`markdown-inline ${className}`}
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
        />
      );
    }

    const parsedHtml = marked.parse(String(text));
    return (
      <div 
        className={`markdown-body ${className}`}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
    );
  } catch (err) {
    // Fallback to plain string if parsing fails
    return <span className={className}>{String(text)}</span>;
  }
};
