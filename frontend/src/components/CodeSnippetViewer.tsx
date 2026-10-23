import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeSnippetViewerProps {
  snippet?: string;
  filePath?: string;
  startLine?: number;
}

export function CodeSnippetViewer({
  snippet,
  filePath,
  startLine = 1,
}: CodeSnippetViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!snippet) {
    return (
      <div className="text-xs text-app-muted italic py-2">
        No code snippet captured for this rule finding.
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = snippet.split('\n');

  return (
    <div className="rounded-[6px] border border-app-border bg-app-canvas overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-white border-b border-app-border text-app-secondary">
        <span className="truncate text-[11px] font-mono">{filePath ? `${filePath}:${startLine}` : 'Evidence Snippet'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-app-secondary hover:text-app-primary transition-colors py-0.5 px-2 rounded hover:bg-app-hover text-[11px]"
          title="Copy snippet"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-app-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="p-3 overflow-x-auto select-text leading-relaxed">
        {lines.map((line, idx) => {
          const lineNum = startLine + idx;
          // Highlight redactions
          const parts = line.split(/(\[REDACTED_[A-Z0-9_]+\]|\*\*\*REDACTED[A-Z0-9_]*\*\*\*)/g);

          return (
            <div key={idx} className="flex gap-4">
              <span className="text-app-muted select-none text-right w-6 shrink-0">{lineNum}</span>
              <span className="text-app-primary">
                {parts.map((part, pIdx) => {
                  if (part.startsWith('[REDACTED') || part.startsWith('***REDACTED')) {
                    return (
                      <span key={pIdx} className="redacted-token">
                        {part}
                      </span>
                    );
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
