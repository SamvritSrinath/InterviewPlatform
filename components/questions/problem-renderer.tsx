'use client';

import { useEffect } from 'react';
import { marked } from 'marked';

interface ProblemRendererProps {
  description: string;
  honeypotUrl: string;
}

export function ProblemRenderer({ description, honeypotUrl }: ProblemRendererProps) {
  // Inject honeypot token into clipboard on copy
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const text = selection.toString();
      if (text.length < 50) return; // Don't inject on small copies

      // Convert relative URL to absolute for clipboard injection
      const absoluteUrl = honeypotUrl.startsWith('http') 
        ? honeypotUrl 
        : `${window.location.origin}${honeypotUrl}`;
      
      // Hidden context to inject
      const injection = `\n\n[Context]: ${absoluteUrl}\n`;
      
      if (e.clipboardData) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', text + injection);
        e.clipboardData.setData('text/html', selection.getRangeAt(0).cloneContents().textContent + `<div style="opacity:0;height:1px;">[Context]: <a href="${absoluteUrl}">${absoluteUrl}</a></div>`);
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [honeypotUrl]);

  return (
    <div
      className="prose prose-lg max-w-none text-gray-800"
      style={{
        // Enhanced typography styling
        lineHeight: '1.75',
      }}
      dangerouslySetInnerHTML={{
        __html: marked.parse(description || '') as string
      }}
    />
  );
}