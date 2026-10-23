import React, { useState, useEffect } from 'react';
import { ScanRecord, RemediationPlan } from '../types';
import { fetchRemediation, fetchPromptText } from '../api/client';
import { SeverityBadge } from '../components/SeverityBadge';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  AlertOctagon,
  FileCode,
  CheckSquare,
  Terminal,
  Loader2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

interface RemediationViewProps {
  scan: ScanRecord | null;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const RemediationView: React.FC<RemediationViewProps> = ({ scan, showToast }) => {
  const [plan, setPlan] = useState<RemediationPlan | null>(null);
  const [promptText, setPromptText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!scan) return;
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const [remediationData, promptData] = await Promise.all([
          fetchRemediation(scan!.id),
          fetchPromptText(scan!.id),
        ]);
        if (active) {
          setPlan(remediationData);
          setPromptText(promptData);
        }
      } catch (err: any) {
        showToast('error', `Failed to load remediation plan: ${err.message}`);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [scan]);

  const handleCopyPrompt = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    showToast('success', 'Ready-to-paste AI repair prompt copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPrompt = () => {
    if (!scan) return;
    window.open(`/api/scans/${scan.id}/prompt?download=true`, '_blank');
  };

  if (!scan) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        Please select or complete a security scan in the Intake Workspace first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-orange animate-spin mx-auto" />
        <h2 className="text-base font-bold text-white">Synthesizing AI Remediation Plan...</h2>
        <p className="text-xs text-slate-400">Contextualizing findings, ranking fix priorities, and assembling coding prompt</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">AI Remediation Plan</h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                plan?.generatedBy === 'gemini'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-brand-orange/15 text-brand-orange border-brand-orange/30'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {plan?.modelUsed || 'AI Synthesis Engine'}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Actionable engineering steps, mandatory credential revocation directives, and consolidated AI coding agent prompt
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPrompt}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vanta-850 hover:bg-vanta-800 border border-white/[0.08] text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Prompt (.md)</span>
          </button>

          <button
            onClick={handleCopyPrompt}
            className="btn-primary-orange flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Ready Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Risk Score & Assessment Summary */}
      {plan && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-vanta-900/80 flex flex-col items-center justify-center text-center space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Contextual Risk Score
            </span>
            <div className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400">
              {plan.riskScore}
              <span className="text-lg text-slate-500 font-normal">/100</span>
            </div>
            <p className="text-xs font-semibold text-rose-300">
              {plan.riskScore >= 70 ? 'Immediate Attention Required' : 'Moderate Security Exposure'}
            </p>
          </div>

          <div className="md:col-span-3 p-6 rounded-2xl border border-white/[0.08] bg-vanta-900/80 space-y-2 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Executive Assessment Summary
            </span>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">{plan.executiveSummary}</p>
          </div>
        </div>
      )}

      {/* Mandatory Credential Rotation Directives */}
      {plan && plan.credentialRotations && plan.credentialRotations.length > 0 && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-4">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>Mandatory Credential Rotation & Revocation Directives</span>
          </div>

          <p className="text-xs text-rose-200 leading-relaxed">
            Exposed credentials cannot be secured simply by modifying source code. If a secret was committed or present in
            an uploaded archive, it must be rotated at the identity provider immediately:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {plan.credentialRotations.map((cr, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-vanta-950/90 border border-rose-500/25 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                    {cr.credentialType}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    {cr.provider}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate text-slate-300">{cr.detectedFile}</span>
                </div>

                <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc marker:text-rose-400 leading-relaxed">
                  {cr.immediateActions.map((action, aIdx) => (
                    <li key={aIdx}>{action}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prioritized Engineering Steps */}
      {plan && plan.prioritizedSteps && plan.prioritizedSteps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand-orange" />
            <span>Prioritised Engineering Remediation Roadmap</span>
          </h2>

          <div className="space-y-3.5">
            {plan.prioritizedSteps.map((step) => (
              <div
                key={step.stepNumber}
                className="p-5 rounded-2xl border border-white/[0.08] bg-vanta-900/70 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-orange/15 text-amber-300 border border-brand-orange/30 text-xs font-bold font-mono">
                      {step.stepNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white">{step.title}</h3>
                  </div>
                  <SeverityBadge severity={step.severity} size="sm" />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-300">Target Files: {step.targetFiles.join(', ')}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-vanta-950 border border-white/[0.06] text-xs text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                  {step.instructions}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consolidated Ready-to-Paste AI Coding Agent Prompt Terminal */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Consolidated Ready-to-Paste Coding Prompt</span>
            </h2>
            <p className="text-xs text-slate-400">
              Formulated with all 10 mandated instructions: project context, redacted snippets, priority roadmap, testing instructions, and constraints.
            </p>
          </div>

          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-orange/15 hover:bg-brand-orange/25 border border-brand-orange/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Full Prompt'}</span>
          </button>
        </div>

        {/* Terminal Window Frame */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#07090f] overflow-hidden shadow-2xl">
          <div className="px-4 py-2.5 bg-vanta-900 border-b border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-slate-400">vantascan-repair-prompt.md</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">Markdown Format • Ready for Claude/Gemini/Cursor</span>
          </div>

          <div className="p-5 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto leading-relaxed select-text whitespace-pre-wrap">
            {promptText}
          </div>
        </div>
      </div>
    </div>
  );
};
