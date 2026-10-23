import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Terminal,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface HeroProductPreviewProps {
  onOpenScanner: () => void;
  onRunDemo?: () => void;
}

export const HeroProductPreview: React.FC<HeroProductPreviewProps> = ({
  onOpenScanner,
  onRunDemo,
}) => {
  const [activeTab, setActiveTab] = useState<'findings' | 'prompt' | 'diff'>('findings');

  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-2xl bg-vanta-900/90 border border-white/[0.12] shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300">
      {/* Top Edge Highlight / Reflection seamlessly hugging the hero beam */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/60 to-brand-orange/90" />

      {/* Interface Window Chrome Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-vanta-950/95 border-b border-white/[0.08] gap-3">
        {/* Left: Window controls and title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <div className="h-3.5 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-white">VantaScan Engine</span>
            <span className="text-[10px] text-slate-500 font-mono">/ review-session-01</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Demo Baseline
            </span>
          </div>
        </div>

        {/* Center: Interactive Preview Tabs */}
        <div className="flex items-center p-0.5 rounded-lg bg-vanta-850 border border-white/[0.06] text-[11px]">
          <button
            onClick={() => setActiveTab('findings')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'findings'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Findings (5)
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'prompt'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Fix Prompt
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'diff'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rescan Verification
          </button>
        </div>

        {/* Right: Direct CTA to open real scanner */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/10 hover:border-amber-500/40 transition-all group"
        >
          <span>Open Full Scanner</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] border-b border-white/[0.08]">
        <div className="bg-vanta-900 p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Vulnerabilities</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-white font-mono">5</span>
            <span className="text-[10px] text-amber-400 font-mono font-medium">Scanned via 4 engines</span>
          </div>
        </div>

        <div className="bg-vanta-900 p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Critical Severity</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-rose-400 font-mono">2</span>
            <span className="text-[10px] text-rose-300/80 font-mono">Immediate Action</span>
          </div>
        </div>

        <div className="bg-vanta-900 p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">High Risk Injection</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-brand-orange font-mono">2</span>
            <span className="text-[10px] text-brand-orange/80 font-mono">RCE & Admin Route</span>
          </div>
        </div>

        <div className="bg-vanta-900 p-3 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AI Remediation</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-emerald-400 font-mono">Ready</span>
            <span className="text-[10px] text-emerald-300/80 font-mono">Copy-paste prompt</span>
          </div>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="p-4 sm:p-5 bg-vanta-950/70">
        {activeTab === 'findings' && (
          <div className="space-y-3">
            {/* Finding Item 1: AWS Secret Key in .env */}
            <div className="p-3.5 rounded-xl bg-vanta-900/90 border border-rose-500/25 hover:border-rose-500/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    CRITICAL
                  </span>
                  <span className="font-semibold text-xs text-white">AWS Secret Access Key Exposed</span>
                  <span className="text-[10px] font-mono text-slate-400">.env:4</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-vanta-800 text-slate-300 border border-white/[0.08]">
                    Gitleaks
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Redacted
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-300/90">
                Active AWS credential identified in configuration file. Keys must be rotated immediately and purged from commit history.
              </p>
              <div className="mt-2 px-3 py-1.5 rounded-lg bg-vanta-950 font-mono text-[11px] text-slate-300 border border-white/[0.06] flex items-center justify-between">
                <span>
                  AWS_SECRET_ACCESS_KEY=<span className="redacted-token">[REDACTED:AWS_KEY]</span>
                </span>
                <span className="text-[10px] text-slate-500">Auto-sanitized before AI intake</span>
              </div>
            </div>

            {/* Finding Item 2: Remote Code Execution via eval() */}
            <div className="p-3.5 rounded-xl bg-vanta-900/90 border border-brand-orange/25 hover:border-brand-orange/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                    HIGH
                  </span>
                  <span className="font-semibold text-xs text-white">Remote Code Execution via eval()</span>
                  <span className="text-[10px] font-mono text-slate-400">src/calculator.js:14</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-vanta-800 text-slate-300 border border-white/[0.08]">
                  Semgrep / Static Rules
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300/90">
                User input passed directly into eval() permits arbitrary JavaScript execution on the server runtime.
              </p>
            </div>

            {/* Finding Item 3: Missing Admin Auth Guard */}
            <div className="p-3.5 rounded-xl bg-vanta-900/90 border border-amber-500/20 hover:border-amber-500/35 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    HIGH
                  </span>
                  <span className="font-semibold text-xs text-white">Unauthenticated Admin Endpoint</span>
                  <span className="text-[10px] font-mono text-slate-400">routes/admin.js:8</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-vanta-800 text-slate-300 border border-white/[0.08]">
                  Route Inspector
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300/90">
                Sensitive administrative route `/admin/export-users` lacks session validation or middleware authorization guards.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="rounded-xl bg-vanta-900 border border-white/[0.08] p-4 font-mono text-xs text-slate-300 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="font-semibold font-sans">Synthesized Gemini AI Agent Remediation Directive</span>
              </div>
              <span className="text-[10px] text-slate-500">10-Section Format</span>
            </div>
            <pre className="text-[11px] leading-relaxed text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
{`# AI CODING AGENT DIRECTIVE: REMEDIATE 5 DETECTED SECURITY FLAWS
Target Project: demo-shop-vulnerable | Security Severity: CRITICAL (9.4/10)

## MANDATORY SECURITY BOUNDARIES
1. Do NOT persist credentials in code or repository history.
2. Replace eval() with deterministic AST-based math parsers.
3. Attach requireAuth middleware on all administrative endpoints.

## FILE-SPECIFIC PATCH INSTRUCTIONS:
- .env: Immediately revoke and remove AWS_SECRET_ACCESS_KEY.
- src/calculator.js: Remove eval(expression); replace with safe parser.
- routes/admin.js: Add verifyAdminToken guard before handler.`}
            </pre>
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] font-sans text-slate-400">
              <span>Ready for Claude, Cursor, Copilot, or Codex</span>
              <button
                onClick={onOpenScanner}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                Copy & Export Full Prompt in Scanner →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-xs text-white">4 Findings Resolved In Verification Rescan</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PASS: 80% Flaw Elimination
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300/90">
                AWS secret key purged from .env, eval() replaced with safe math parser, and admin route protected by auth middleware.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-vanta-900 border border-white/[0.06] flex items-center justify-between">
                <span className="text-slate-300 truncate">AWS Secret Key (.env)</span>
                <span className="text-emerald-400 font-semibold font-mono text-[11px]">✓ RESOLVED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-vanta-900 border border-white/[0.06] flex items-center justify-between">
                <span className="text-slate-300 truncate">eval() RCE (calculator.js)</span>
                <span className="text-emerald-400 font-semibold font-mono text-[11px]">✓ RESOLVED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-vanta-900 border border-white/[0.06] flex items-center justify-between">
                <span className="text-slate-300 truncate">Admin Route Bypass (admin.js)</span>
                <span className="text-emerald-400 font-semibold font-mono text-[11px]">✓ RESOLVED</span>
              </div>
              <div className="p-2.5 rounded-lg bg-vanta-900 border border-white/[0.06] flex items-center justify-between">
                <span className="text-slate-300 truncate">Wildcard CORS Policy</span>
                <span className="text-emerald-400 font-semibold font-mono text-[11px]">✓ RESOLVED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Footer Ribbon */}
      <div className="px-4 py-2.5 bg-vanta-900 border-t border-white/[0.06] flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Engines active: Gitleaks 8.30, Semgrep, Trivy 0.76, Gemini AI</span>
        </div>
        <button
          onClick={onOpenScanner}
          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
        >
          Run your own repository scan now →
        </button>
      </div>
    </div>
  );
};
