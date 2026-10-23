import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanRecord, ScannerReadiness } from '../types';
import { uploadScan, submitGitHubScan, runDemoScan } from '../api/client';
import {
  UploadCloud,
  FileArchive,
  GitBranch,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface IntakeViewProps {
  readiness: ScannerReadiness | null;
  scans?: ScanRecord[];
  onScanCreated: (scan: ScanRecord) => void;
  onNavigateToLive: (scanId: string) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function IntakeView({
  readiness,
  scans = [],
  onScanCreated,
  onNavigateToLive,
  showToast,
}: IntakeViewProps) {
  const [intakeMethod, setIntakeMethod] = useState<'zip' | 'github'>('zip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('vantascan');
  const [baselineScanId, setBaselineScanId] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState('');
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // GitHub Intake Form State
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setValidationError('Invalid archive format. Only .zip source archives are supported.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setValidationError('Archive exceeds maximum size limit of 50MB.');
        return;
      }
      setSelectedFile(file);
      if (!projectName || projectName === 'vantascan') {
        setProjectName(file.name.replace(/\.zip$/i, ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setValidationError('Invalid archive format. Only .zip source archives are supported.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setValidationError('Archive exceeds maximum size limit of 50MB.');
        return;
      }
      setSelectedFile(file);
      if (!projectName || projectName === 'vantascan') {
        setProjectName(file.name.replace(/\.zip$/i, ''));
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitZip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select or drop a source code ZIP archive.');
      return;
    }
    if (targetUrl && !authorizedConsent) {
      setValidationError('You must certify authorized testing consent to inspect live target URLs.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectName', projectName.trim() || selectedFile.name.replace(/\.zip$/i, ''));
      if (baselineScanId) formData.append('baselineScanId', baselineScanId);
      if (targetUrl.trim()) formData.append('targetUrl', targetUrl.trim());
      if (authorizedConsent) formData.append('authorizedConsent', 'true');

      showToast('info', 'Analyzing and uncompressing source archive...');
      const scan = await uploadScan(formData);
      onScanCreated(scan);
      showToast('success', `Scan ${scan.id} completed: ${scan.summary.total} findings identified.`);
      onNavigateToLive(scan.id);
    } catch (err: any) {
      setValidationError(err.message || 'Scan execution failed');
      showToast('error', err.message || 'Scan failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setValidationError('Please enter a valid GitHub repository URL.');
      return;
    }

    const match = repoUrl.trim().match(/^https:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:\/)?$/);
    if (!match) {
      setValidationError('Invalid GitHub repository URL. Expected format: https://github.com/owner/repository');
      return;
    }

    if (targetUrl && !authorizedConsent) {
      setValidationError('You must certify authorized testing consent to inspect live target URLs.');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      showToast('info', `Cloning and auditing public GitHub repository...`);
      const scan = await submitGitHubScan({
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || undefined,
        projectName: projectName.trim() || `${match[1]}/${match[2]}`,
        targetUrl: targetUrl.trim() || undefined,
        authorizedConsent,
      });
      onScanCreated(scan);
      showToast('success', `GitHub scan ${scan.id} completed: ${scan.summary.total} findings.`);
      onNavigateToLive(scan.id);
    } catch (err: any) {
      setValidationError(err.message || 'GitHub scan failed');
      showToast('error', err.message || 'GitHub ingestion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunDemo = async (mode: 'vulnerable' | 'corrected') => {
    setIsSubmitting(true);
    setValidationError(null);
    try {
      showToast('info', `Running ${mode === 'vulnerable' ? 'Vulnerable Baseline' : 'Patched Verification'} demo scan...`);
      const res = await runDemoScan(mode, baselineScanId || undefined);
      onScanCreated(res.scan);
      showToast('success', `Demo scan completed with ${res.scan.summary.total} findings.`);
      onNavigateToLive(res.scan.id);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to run demo scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = intakeMethod === 'zip' ? Boolean(selectedFile) : Boolean(repoUrl.trim());

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Page Title & Philosophy from ss2 */}
      <div className="mb-8">
        <h1 className="text-[32px] sm:text-[34px] font-semibold tracking-tight text-neutral-900 leading-tight">
          Let&apos;s secure your code.
        </h1>
        <p className="text-sm text-neutral-500 mt-2 max-w-2xl leading-relaxed">
          Bring your project into VantaScan. We&apos;ll inspect the source, identify security risks, and help you fix what matters.
        </p>
      </div>

      {/* Validation Error Banner */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-6 p-4 rounded-[8px] bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <div className="font-semibold mb-0.5">Submission Error</div>
              <div>{validationError}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2-Column Grid Split Layout matching ss2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Main Intake Card (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-neutral-200/90 rounded-[10px] p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Card Header: SOURCE label and Segmented Pill Tabs */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-400 font-semibold">
              SOURCE
            </span>

            <div className="inline-flex p-1 bg-neutral-100 rounded-[8px] text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setIntakeMethod('zip');
                  setValidationError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] transition-all font-medium ${
                  intakeMethod === 'zip'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <FileArchive className="w-3.5 h-3.5" />
                <span>ZIP archive</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIntakeMethod('github');
                  setValidationError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] transition-all font-medium ${
                  intakeMethod === 'github'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>GitHub repository</span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          {intakeMethod === 'zip' ? (
            <form onSubmit={handleSubmitZip} className="space-y-6">
              {/* Dropzone */}
              {!selectedFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-neutral-300 rounded-[8px] py-14 px-6 text-center cursor-pointer hover:border-neutral-400 hover:bg-neutral-50/40 transition-colors my-6"
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3 text-neutral-600">
                    <UploadCloud className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-medium text-neutral-900">
                    Drop a project ZIP here, or <span className="underline decoration-neutral-400 font-medium cursor-pointer">browse</span>
                  </p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                    Source code only, up to 50 MB. Nothing is executed, and node_modules, .git and build folders are skipped.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="my-6 p-4 bg-neutral-50 border border-neutral-200 rounded-[8px] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[6px] bg-white border border-neutral-200 flex items-center justify-center text-neutral-700">
                      <FileArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">{selectedFile.name}</div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Ready to inspect
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-neutral-400 hover:text-red-600 p-1.5 rounded transition-colors"
                    title="Remove archive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <p className="text-[11px] font-mono text-neutral-400 -mt-2">
                .zip only · up to 50 MB · 5,000 files · 200 MB unpacked
              </p>

              {/* Input Row: Project name & Compare with optional baseline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1.5">
                    Project name
                  </label>
                  <input
                    type="text"
                    placeholder="vantascan"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-[6px] text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1.5">
                    Compare with optional baseline
                  </label>
                  <div className="relative">
                    <select
                      value={baselineScanId}
                      onChange={(e) => setBaselineScanId(e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border border-neutral-200 rounded-[6px] text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 pr-8 cursor-pointer transition-colors"
                    >
                      <option value="">None, fresh scan</option>
                      {scans.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.projectName} ({s.id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Card Footer: Status text & Start scan button */}
              <div className="pt-6 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {selectedFile
                    ? `Archive ready to scan (${(selectedFile.size / 1024).toFixed(1)} KB)`
                    : 'Choose a ZIP archive to continue.'}
                </span>

                <motion.button
                  whileHover={canSubmit ? { scale: 1.01 } : undefined}
                  whileTap={canSubmit ? { scale: 0.98 } : undefined}
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={`px-4 py-2 rounded-[6px] text-xs font-medium transition-colors ${
                    canSubmit
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm cursor-pointer'
                      : 'bg-[#9ca3af] text-white cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning...</span>
                    </span>
                  ) : (
                    <span>Start scan</span>
                  )}
                </motion.button>
              </div>
            </form>
          ) : (
            /* GitHub Ingestion Form */
            <form onSubmit={handleSubmitGitHub} className="space-y-6 pt-4">
              <div className="border border-neutral-200 rounded-[8px] p-5 bg-neutral-50/50 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1.5">
                    GitHub repository URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-[6px] text-xs text-neutral-900 font-mono placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  />
                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    Public repositories only. Credentials or personal access tokens in URLs are strictly rejected.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1.5">
                    Branch (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="main or master (default)"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-[6px] text-xs text-neutral-900 font-mono placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </div>

              {/* Input Row: Project name & Compare with optional baseline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1.5">
                    Project name
                  </label>
                  <input
                    type="text"
                    placeholder="vantascan"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-[6px] text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1.5">
                    Compare with optional baseline
                  </label>
                  <div className="relative">
                    <select
                      value={baselineScanId}
                      onChange={(e) => setBaselineScanId(e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border border-neutral-200 rounded-[6px] text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 pr-8 cursor-pointer transition-colors"
                    >
                      <option value="">None, fresh scan</option>
                      {scans.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.projectName} ({s.id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-6 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {repoUrl.trim() ? 'Repository ready to clone & audit.' : 'Enter a public GitHub repository.'}
                </span>

                <motion.button
                  whileHover={canSubmit ? { scale: 1.01 } : undefined}
                  whileTap={canSubmit ? { scale: 0.98 } : undefined}
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={`px-4 py-2 rounded-[6px] text-xs font-medium transition-colors ${
                    canSubmit
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm cursor-pointer'
                      : 'bg-[#9ca3af] text-white cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cloning...</span>
                    </span>
                  ) : (
                    <span>Start scan</span>
                  )}
                </motion.button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Sidebar Cards (4 cols) matching ss2 */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: SCANNER READINESS */}
          <div className="bg-white border border-neutral-200/90 rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
            <div className="text-[11px] font-mono tracking-wider uppercase text-neutral-400 font-semibold">
              SCANNER READINESS
            </div>

            {/* Gitleaks */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-neutral-900">
                  <span className={`w-2 h-2 rounded-full ${readiness?.gitleaks?.installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  Gitleaks
                </span>
                <span className="font-mono text-neutral-400 text-xs">
                  {readiness?.gitleaks?.installed
                    ? (readiness.gitleaks.version?.match(/(\d+\.\d+(?:\.\d+)?)/)?.[0] ? `v${readiness.gitleaks.version.match(/(\d+\.\d+(?:\.\d+)?)/)![0]}` : 'installed')
                    : 'not installed'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Hard-coded keys, tokens and passwords
              </p>
              <p className={`text-xs mt-1 ${readiness?.gitleaks?.installed ? 'text-emerald-700/90 font-medium' : 'text-amber-700/90'}`}>
                {readiness?.gitleaks?.installed ? 'Ready to execute.' : 'Will be skipped and reported as not run.'}
              </p>
            </div>

            {/* Semgrep */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-neutral-900">
                  <span className={`w-2 h-2 rounded-full ${readiness?.semgrep?.installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  Semgrep
                </span>
                <span className="font-mono text-neutral-400 text-xs">
                  {readiness?.semgrep?.installed
                    ? (readiness.semgrep.version?.match(/(\d+\.\d+(?:\.\d+)?)/)?.[0] ? `v${readiness.semgrep.version.match(/(\d+\.\d+(?:\.\d+)?)/)![0]}` : 'installed')
                    : 'not installed'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Injection, XSS, auth and crypto mistakes in JS/TS
              </p>
              <p className={`text-xs mt-1 ${readiness?.semgrep?.installed ? 'text-emerald-700/90 font-medium' : 'text-amber-700/90'}`}>
                {readiness?.semgrep?.installed ? 'Ready to execute.' : 'Will be skipped and reported as not run.'}
              </p>
            </div>

            {/* Trivy */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-neutral-900">
                  <span className={`w-2 h-2 rounded-full ${readiness?.trivy?.installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  Trivy
                </span>
                <span className="font-mono text-neutral-400 text-xs">
                  {readiness?.trivy?.installed
                    ? (readiness.trivy.version?.match(/(\d+\.\d+(?:\.\d+)?)/)?.[0] ? `v${readiness.trivy.version.match(/(\d+\.\d+(?:\.\d+)?)/)![0]}` : 'installed')
                    : 'not installed'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Secrets, risky config and vulnerable dependencies
              </p>
              <p className={`text-xs mt-1 ${readiness?.trivy?.installed ? 'text-emerald-700/90 font-medium' : 'text-amber-700/90'}`}>
                {readiness?.trivy?.installed ? 'Ready to execute.' : 'Will be skipped and reported as not run.'}
              </p>
            </div>

            {/* AI explanations note */}
            <div className="pt-3 border-t border-neutral-100 text-xs text-neutral-500 leading-relaxed">
              AI explanations: off. Scanning and repair prompts work without it.
            </div>
          </div>

          {/* Card 2: WHAT HAPPENS TO YOUR CODE */}
          <div className="bg-white border border-neutral-200/90 rounded-[10px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="text-[11px] font-mono tracking-wider uppercase text-neutral-400 font-semibold mb-3">
              WHAT HAPPENS TO YOUR CODE
            </div>
            <ul className="space-y-2.5 text-xs text-neutral-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-neutral-400">•</span>
                <span>Unpacked into a private workspace and deleted after the scan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400">•</span>
                <span>Never executed: no installs, builds or scripts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-400">•</span>
                <span>Code stays local to this machine.</span>
              </li>
            </ul>
          </div>

          {/* Fast 1-Click Synthetic Demo Triggers (Clean & Subtle) */}
          <div className="p-3 bg-neutral-100/70 border border-neutral-200/60 rounded-[8px] flex items-center justify-between text-xs text-neutral-600">
            <span className="font-mono text-[11px] text-neutral-500">Test demo fixture:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRunDemo('vulnerable')}
                disabled={isSubmitting}
                className="text-[11px] font-medium text-neutral-800 hover:text-black underline cursor-pointer"
              >
                Vulnerable
              </button>
              <span className="text-neutral-300">·</span>
              <button
                type="button"
                onClick={() => handleRunDemo('corrected')}
                disabled={isSubmitting}
                className="text-[11px] font-medium text-neutral-800 hover:text-black underline cursor-pointer"
              >
                Patched
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
