import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Finding } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { CodeSnippetViewer } from './CodeSnippetViewer';
import {
  X,
  ExternalLink,
  FileCode,
  CheckCircle2,
  AlertOctagon,
  Copy,
  Check,
} from 'lucide-react';

interface FindingDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
}

export function FindingDetailModal({ finding, onClose }: FindingDetailModalProps) {
  const [copiedFile, setCopiedFile] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!finding) return null;

  const isSecret = finding.category === 'Hardcoded Secret';

  const handleCopyLocation = () => {
    const text = `${finding.filePath}${finding.startLine ? `:${finding.startLine}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm select-text"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] bg-white border border-app-border rounded-[6px] shadow-app-elevated flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-app-border bg-app-canvas gap-3">
          <div className="space-y-2 pr-2 sm:pr-6 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <span className="text-xs font-mono text-app-secondary px-2 py-0.5 rounded bg-white border border-app-border">
                {finding.scanner} :: {finding.ruleId}
              </span>
              <span className="text-xs font-mono uppercase text-app-muted px-2 py-0.5 rounded bg-white border border-app-border">
                {finding.category}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-app-primary tracking-tight break-words">
              {finding.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-app-secondary font-mono break-all">
              <div className="flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-app-muted shrink-0" />
                <span>
                  {finding.filePath}
                  {finding.startLine ? `:${finding.startLine}${finding.endLine && finding.endLine !== finding.startLine ? `–${finding.endLine}` : ''}` : ''}
                </span>
              </div>

              <button
                onClick={handleCopyLocation}
                className="text-[11px] text-app-muted hover:text-app-primary underline inline-flex items-center gap-1 shrink-0"
                title="Copy file path"
              >
                {copiedFile ? <Check className="w-3 h-3 text-app-success" /> : <Copy className="w-3 h-3" />}
                <span>{copiedFile ? 'Copied' : 'Copy reference'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-app-muted hover:text-app-primary hover:bg-app-hover transition-colors shrink-0"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-sm text-app-body leading-relaxed">
          {/* Secret Revocation Notice Banner if secret */}
          {isSecret && (
            <div className="p-4 rounded-[6px] bg-red-50 border border-red-200 text-red-900 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-xs text-red-800">
                <AlertOctagon className="w-4 h-4 shrink-0 text-red-600" />
                <span>Mandatory Credential Revocation Notice</span>
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                Removing this credential from source code does <strong>not</strong> invalidate it. An exposed secret remains active in production infrastructure until explicitly revoked through the provider dashboard.
              </p>
            </div>
          )}

          {/* Evidence Snippet */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-app-primary mb-2">
              Evidence & Code Snippet
            </h3>
            <CodeSnippetViewer
              snippet={finding.snippet}
              filePath={finding.filePath}
              startLine={finding.startLine}
            />
          </div>

          {/* Plain-Language Impact */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-app-primary mb-2">
              Plain-Language Impact
            </h3>
            <div className="p-3.5 rounded-[6px] bg-app-canvas border border-app-border text-app-body text-xs leading-relaxed">
              {finding.plainLanguageImpact}
            </div>
          </div>

          {/* Technical Explanation */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-app-primary mb-2">
              Technical Description
            </h3>
            <div className="p-3.5 rounded-[6px] bg-app-canvas border border-app-border text-app-body text-xs leading-relaxed">
              {finding.technicalExplanation}
            </div>
          </div>

          {/* Recommended Remediation */}
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-app-primary mb-2">
              Recommended Remediation
            </h3>
            <div className="p-3.5 rounded-[6px] bg-app-canvas border border-app-border text-app-primary font-mono text-xs whitespace-pre-line leading-relaxed">
              {finding.recommendedRemediation}
            </div>
          </div>

          {/* Scanner Verification Evidence */}
          {finding.verificationEvidence && (
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-app-primary mb-2">
                Scanner Attribution & Traceability
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono text-app-success bg-app-success-bg border border-app-success-border px-3 py-2 rounded-[6px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{finding.verificationEvidence}</span>
              </div>
            </div>
          )}

          {/* External References */}
          {finding.references && finding.references.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-app-primary mb-2">
                Security References & CWE
              </h3>
              <ul className="space-y-1.5">
                {finding.references.map((ref, idx) => (
                  <li key={idx}>
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-app-info hover:underline truncate max-w-full font-mono"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ref}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-app-border bg-app-canvas flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-[11px] text-app-muted font-mono truncate max-w-full sm:max-w-[320px]">
            Fingerprint: {finding.fingerprint}
          </span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-[6px] text-xs font-medium bg-app-primary text-white hover:bg-neutral-800 transition-colors shadow-xs text-center"
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

