'use client';

import { useEffect } from 'react';
import { Box } from '@mui/material';
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
    <Box
      sx={{
        '& p': { mb: 2, fontSize: '1rem', lineHeight: 1.75, color: 'text.primary' },
        '& h1': { fontSize: '1.875rem', fontWeight: 700, mb: 2, mt: 3, color: 'text.primary' },
        '& h2': { fontSize: '1.5rem', fontWeight: 700, mb: 1.5, mt: 2.5, color: 'text.primary' },
        '& h3': { fontSize: '1.25rem', fontWeight: 600, mb: 1.25, mt: 2, color: 'text.primary' },
        '& h4': { fontSize: '1.125rem', fontWeight: 600, mb: 1, mt: 1.5, color: 'text.primary' },
        '& ul, & ol': { pl: 4, mb: 2, '& li': { mb: 0.75, lineHeight: 1.75 } },
        '& ul': { listStyleType: 'disc' },
        '& ol': { listStyleType: 'decimal' },
        '& blockquote': {
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          pl: 2,
          py: 1,
          my: 2,
          bgcolor: 'grey.50',
          fontStyle: 'italic',
          color: 'text.secondary',
        },
        '& a': {
          color: 'primary.main',
          textDecoration: 'underline',
          '&:hover': { color: 'primary.dark' },
        },
        '& pre': {
          bgcolor: '#1e293b',
          color: '#e2e8f0',
          p: 2.5,
          borderRadius: 2,
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '0.875rem',
          mb: 2,
          mt: 1.5,
          lineHeight: 1.6,
          '& code': {
            bgcolor: 'transparent',
            padding: 0,
            color: 'inherit',
            fontSize: 'inherit',
            fontFamily: 'inherit',
            border: 'none',
          },
        },
        '& code': {
          bgcolor: '#f1f5f9',
          color: '#0f172a',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        '& strong': { fontWeight: 700, color: 'text.primary' },
        '& em': { fontStyle: 'italic' },
        '& hr': {
          border: 'none',
          borderTop: '1px solid',
          borderColor: 'grey.300',
          my: 3,
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          mb: 2,
          mt: 1.5,
          '& th, & td': {
            border: '1px solid',
            borderColor: 'grey.300',
            px: 1.5,
            py: 1,
            textAlign: 'left',
          },
          '& th': {
            bgcolor: 'grey.100',
            fontWeight: 600,
            color: 'text.primary',
          },
        },
        maxWidth: 'none',
        lineHeight: 1.75,
        color: 'text.primary',
      }}
      dangerouslySetInnerHTML={{
        __html: marked.parse(description || '') as string
      }}
    />
  );
}