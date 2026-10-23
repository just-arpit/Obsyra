import React, { useState } from 'react';
import { ScanRecord } from '../types';
import { uploadScan, runDemoScan, deleteScan } from '../api/client';
import {
  Upload,
  FileArchive,
  Globe,
  Shield,
  Sparkles,
  Check,
  Trash2,
  ArrowRight,
  Loader2,
  Play,
  Lock,
  Clock,
  Code2,
  CheckCircle2,
  X,
  FileCheck,
} from 'lucide-react';

interface WorkspaceViewProps {
  onScanCompleted: (scan: ScanRecord) => void;
  scans: ScanRecord[];
  onSelectScan: (scan: ScanRecord) => void;
  onRefreshScans: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  onScanCompleted,
  scans,
  onSelectScan,
  onRefreshScans,
  showToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showToast('error', 'Please upload a valid .zip source-code archive.');
      return;
    }
    setSelectedFile(file);
    if (!projectName) {
      setProjectName(file.name.replace(/\.zip$/i, ''));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('error', 'Please select or drop a source-code ZIP archive to scan.');
      return;
    }

    if (targetUrl && !authorizedConsent) {
      showToast('error', 'Please confirm you are authorized to inspect the deployed URL.');
      return;
    }

    setIsScanning(true);
    setScanStage('Extracting archive & orchestrating multi-scanner audit...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (projectName) formData.append('projectName', projectName);
      if (targetUrl) formData.append('targetUrl', targetUrl);
      formData.append('authorizedConsent', authorizedConsent ? 'true' : 'false');

      const result = await uploadScan(formData);
      showToast('success', `Scan completed: ${result.findings.length} findings across ${result.fileCount} files.`);
      onScanCompleted(result);
    } catch (err: any) {
      showToast('error', `Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
      setScanStage('');
    }
  };

  const handleQuickDemo = async (mode: 'vulnerable' | 'corrected') => {
    setIsScanning(true);
    setScanStage(
      mode === 'vulnerable'
        ? 'Scanning vulnerable test fixture with Gitleaks, Semgrep, Trivy & Rule Engine...'
        : 'Scanning corrected fixture and computing rescan verification diff...'
    );

    try {
      const baselineId = mode === 'corrected' && scans.length > 0 ? scans[0].id : undefined;
      const res = await runDemoScan(mode, baselineId);
      showToast(
        'success',
        mode === 'vulnerable'
          ? `Vulnerable Demo audited: ${res.scan.findings.length} findings captured with evidence!`
          : `Corrected Demo audited: Resolution transitions verified!`
      );
      onScanCompleted(res.scan);
    } catch (err: any) {
      showToast('error', `Demo scan error: ${err.message}`);
    } finally {
      setIsScanning(false);
      setScanStage('');
    }
  };

  const handleDeleteScan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteScan(id);
      showToast('info', `Scan ${id} removed.`);
      onRefreshScans();
    } catch (err: any) {
      showToast('error', `Could not delete scan: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-brand-orange/15 via-amber-500/10 to-brand-orange/15 border border-brand-orange/30 text-amber-300 text-xs font-semibold shadow-inner">
          <Shield className="w-3.5 h-3.5 text-brand-orange" />
          <span>Full-Stack AI Security Reviewer</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Audit AI-Generated Code.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-amber-300 to-amber-500">
            Verify Every Fix.
          </span>
        </h1>

        <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Submit source archives built with AI coding assistants. Detect hardcoded secrets, injection flaws, and missing access controls.
          Generate copy-ready remediation prompts and rescan to mathematically verify fixes.
        </p>
      </div>

      {/* 2-Step Guided Demonstration Walkthrough Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step 1: Baseline Vulnerable Demo */}
        <div className="relative group rounded-2xl p-6 bg-gradient-to-br from-rose-950/30 via-vanta-900 to-vanta-900 border border-rose-500/30 hover:border-rose-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Step 1: Baseline Audit
              </span>
              <span className="text-[11px] font-mono text-slate-400">Pre-Built Fixture</span>
            </div>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-rose-400" />
              <span>1-Click Vulnerable Project Audit</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Executes Gitleaks, Semgrep, and Trivy on a synthetic Node/Express project containing hardcoded Gemini/AWS keys,
              dynamic <code className="text-rose-300 font-mono">eval()</code> injection, unauthenticated administrative routes, and wildcard CORS.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Leaked Secrets', 'Code Injection', 'Missing Auth', 'CORS *'].map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleQuickDemo('vulnerable')}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all cursor-pointer"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>Run Vulnerable Demo Scan</span>
          </button>
        </div>

        {/* Step 2: Rescan Corrected Demo */}
        <div className="relative group rounded-2xl p-6 bg-gradient-to-br from-emerald-950/30 via-vanta-900 to-vanta-900 border border-emerald-500/30 hover:border-emerald-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Step 2: Rescan Verification
              </span>
              <span className="text-[11px] font-mono text-slate-400">Resolution Diff</span>
            </div>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>1-Click Corrected Project Rescan</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Audits the patched version. The stateful comparison engine confirms that secrets are migrated to environment variables,
              <code className="text-emerald-300 font-mono"> eval()</code> is replaced with safe parsers, and routes are protected.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Resolved Findings', 'Evidence Diffs', 'Coverage Proof', 'Zero Regressions'].map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleQuickDemo('corrected')}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Run Corrected Rescan & Verify</span>
          </button>
        </div>
      </div>

      {/* Main Source Intake Panel */}
      <form onSubmit={handleStartScan} className="rounded-2xl border border-white/[0.08] bg-vanta-900/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-brand-orange" />
              <span>Upload Custom Repository Archive</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure sandbox extraction • Traversal defense • Dependencies (<code className="text-slate-300">node_modules</code>, <code className="text-slate-300">.git</code>) excluded
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-vanta-850 px-2.5 py-1 rounded-lg border border-white/[0.06]">
            Max 25MB • ZIP Format
          </span>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-brand-orange bg-brand-orange/10 scale-[1.005]'
                : selectedFile
                ? 'border-emerald-500/40 bg-emerald-950/10'
                : 'border-white/[0.12] hover:border-brand-orange/50 bg-vanta-950/50 hover:bg-vanta-950/70'
            }`}
          >
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-sm">
                  <FileCheck className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
                    <span>{selectedFile.name}</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">Archive ready for multi-scanner ingestion</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="mt-2 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Choose different file</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange group-hover:scale-105 transition-transform">
                  <FileArchive className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drag and drop your project <span className="text-brand-orange">.ZIP</span> here, or{' '}
                    <span className="text-brand-orange underline underline-offset-4">browse files</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Accepts standard ZIP archives up to 25MB uncompressed</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., My-Production-App"
              className="w-full px-4 py-2.5 rounded-xl bg-vanta-950 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Deployed Target URL (Optional Header/Cookie Audit)</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://staging.myapp.com"
              className="w-full px-4 py-2.5 rounded-xl bg-vanta-950 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange transition-colors"
            />
          </div>
        </div>

        {/* URL Inspection Authorization Consent */}
        {targetUrl && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs animate-fade-in">
            <input
              type="checkbox"
              id="consent"
              checked={authorizedConsent}
              onChange={(e) => setAuthorizedConsent(e.target.checked)}
              className="mt-0.5 rounded bg-vanta-900 border-vanta-700 text-brand-orange focus:ring-0 cursor-pointer"
            />
            <label htmlFor="consent" className="text-slate-300 leading-relaxed cursor-pointer select-none">
              <span className="font-semibold text-white">Authorization Certification: </span>
              I confirm and certify that I have explicit authorization to perform a passive security review on this deployed endpoint.
              VantaScan enforces strict SSRF protections: private network addresses (RFC1918), localhost, and cloud metadata are blocked.
            </label>
          </div>
        )}

        {/* Action Button & Live Progress */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
          <div className="text-xs text-slate-400">
            {isScanning ? (
              <span className="flex items-center gap-2 text-brand-orange animate-pulse font-mono">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                {scanStage}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero code execution • Redacted secrets • Non-destructive passive audit</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isScanning || !selectedFile}
            className="w-full sm:w-auto btn-primary-orange flex items-center justify-center gap-2 px-8 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{isScanning ? 'Executing Multi-Scanner Audit...' : 'Start Security Scan'}</span>
          </button>
        </div>
      </form>

      {/* Previous Scans History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Repository Review History</h2>
            <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-full bg-vanta-850 border border-white/[0.06]">
              {scans.length}
            </span>
          </div>
          <span className="text-xs text-slate-400">Click any review to inspect findings</span>
        </div>

        {scans.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-white/[0.08] bg-vanta-900/40 text-slate-400 text-xs">
            No audits recorded in SQLite persistence. Use the form above or trigger a 1-Click Demo to start.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-vanta-900/60 overflow-hidden divide-y divide-white/[0.06]">
            {scans.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectScan(s)}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                <div className="space-y-1.5 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white group-hover:text-brand-orange transition-colors">
                      {s.projectName}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded bg-vanta-950 border border-white/[0.08]">
                      {s.id}
                    </span>
                    {s.baselineScanId && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Rescan Diff
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(s.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span>•</span>
                    <span>{s.fileCount} files</span>
                    <span>•</span>
                    <span>{(s.totalSizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Severity Counters */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    {s.summary.critical > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold">
                        {s.summary.critical} Crit
                      </span>
                    )}
                    {s.summary.high > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25 font-bold">
                        {s.summary.high} High
                      </span>
                    )}
                    {s.summary.medium > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold">
                        {s.summary.medium} Med
                      </span>
                    )}
                    {s.summary.total === 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
                        0 Issues
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDeleteScan(s.id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Scan Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
