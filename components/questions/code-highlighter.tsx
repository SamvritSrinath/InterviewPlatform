'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeHighlighterProps {
  code: string;
  language?: string;
}

export function CodeHighlighter({ code, language = 'python' }: CodeHighlighterProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      customStyle={{
        margin: 0,
        padding: '1.5rem',
        fontSize: '0.875rem',
        lineHeight: 1.7,
      }}
      showLineNumbers={false}
    >
      {code}
    </SyntaxHighlighter>
  );
}

