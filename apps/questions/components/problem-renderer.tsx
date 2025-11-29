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

      // Hidden context to inject
      const injection = `\n\n[Context]: ${honeypotUrl}\n`;
      
      if (e.clipboardData) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', text + injection);
        e.clipboardData.setData('text/html', selection.getRangeAt(0).cloneContents().textContent + `<div style="opacity:0;height:1px;">[Context]: <a href="${honeypotUrl}">${honeypotUrl}</a></div>`);
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [honeypotUrl]);

  return (
    <div
      className="prose max-w-none text-gray-700"
      dangerouslySetInnerHTML={{
        __html: marked.parse(description || '') as string
      }}
    />
  );
}