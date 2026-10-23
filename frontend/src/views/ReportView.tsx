import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanRecord, Finding, Severity, ScannerName, RemediationPlan } from '../types';
import { fetchRemediation } from '../api/client';
import { SeverityBadge } from '../components/SeverityBadge';
import {
  Search,
  Filter,
  Shield,
  FileCode,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RefreshCw,
  GitCompare,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

interface ReportViewProps {
  scan: ScanRecord | null;
  onSelectFinding: (finding: Finding) => void;
  onInitiateRescan: (baselineScanId: string) => void;
  onNavigateToCompare?: (scanId: string) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function ReportView({
  scan,
  onSelectFinding,
  onInitiateRescan,
  onNavigateToCompare,
  showToast,
}: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'remediation'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [scannerFilter, setScannerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'file' | 'scanner'>('severity');

  // AI Remediation Plan State
  const [remediationPlan, setRemediationPlan] = useState<RemediationPlan | null>(null);
  const [isLoadingRemediation, setIsLoadingRemediation] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Load AI Remediation Plan on demand
  const handleLoadRemediation = async () => {
    if (!scan) return;
    if (remediationPlan) {
      setActiveTab('remediation');
      return;
    }
    setIsLoadingRemediation(true);
    setActiveTab('remediation');
    try {
      showToast('info', 'Generating contextual AI repair guidance and agent prompt...');
      const plan = await fetchRemediation(scan.id);
      setRemediationPlan(plan);
      showToast('success', `Repair prompt generated using ${plan.generatedBy === 'gemini' ? 'Google Gemini AI' : 'Deterministic Rules'}`);
    } catch (err: any) {
      showToast('error', err.message || 'Could not load AI remediation');
    } finally {
      setIsLoadingRemediation(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!remediationPlan?.readyToPasteRepairPrompt) return;
    navigator.clipboard.writeText(remediationPlan.readyToPasteRepairPrompt);
    setCopiedPrompt(true);
    showToast('success', 'Repair prompt copied to clipboard');
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleDownloadPrompt = () => {
    if (!remediationPlan?.readyToPasteRepairPrompt || !scan) return;
    const blob = new Blob([remediationPlan.readyToPasteRepairPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vantascan-repair-prompt-${scan.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'Repair prompt exported as Markdown file');
  };

  // Filter and sort findings
  const filteredFindings = useMemo(() => {
    if (!scan) return [];
    let list = [...scan.findings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.filePath.toLowerCase().includes(q) ||
          f.ruleId.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    if (severityFilter !== 'all') {
      list = list.filter((f) => f.severity === severityFilter);
    }

    if (scannerFilter !== 'all') {
      list = list.filter((f) => f.scanner === scannerFilter);
    }

    const severityWeight: Record<Severity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };

    if (sortBy === 'severity') {
      list.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
    } else if (sortBy === 'file') {
      list.sort((a, b) => a.filePath.localeCompare(b.filePath));
    } else if (sortBy === 'scanner') {
      list.sort((a, b) => a.scanner.localeCompare(b.scanner));
    }

    return list;
  }, [scan, searchQuery, severityFilter, scannerFilter, sortBy]);

  if (!scan) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <Shield className="w-10 h-10 text-app-muted mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-app-primary mb-1">No Scan Selected</h2>
        <p className="text-xs text-app-secondary mb-6">
          Submit a new project or select a previous scan from history to inspect findings.
        </p>
      </div>
    );
  }

  const failedScanners = scan.scannersRun.filter((s) => s.error && s.findingsCount === 0);
  const hasIncompleteCoverage = failedScanners.length > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-6 py-10"
    >
      {/* Top Header Card */}
      <motion.div variants={itemVariants} className="bg-white border border-app-border rounded-[6px] p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-app-border gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase text-app-muted">SCAN REPORT</span>
              <span className="font-mono text-xs text-app-primary bg-app-canvas px-2 py-0.5 rounded border border-app-border">
                {scan.id}
              </span>
              {scan.baselineScanId && (
                <span className="font-mono text-[11px] text-app-info bg-app-info-bg px-2 py-0.5 rounded border border-app-info-border">
                  Rescan of {scan.baselineScanId}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-app-primary tracking-tight">
              {scan.projectName}
            </h1>
            <p className="text-xs text-app-secondary font-mono mt-1">
              {scan.fileCount} source files · {(scan.totalSizeBytes / 1024).toFixed(1)} KB · Analyzed on {new Date(scan.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onInitiateRescan(scan.id)}
              className="inline-flex items-center gap-1.5 bg-app-primary text-white hover:bg-neutral-800 text-xs font-medium px-4 py-2 rounded-[6px] transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rescan & Verify Fixes</span>
            </motion.button>

            {scan.baselineScanId && onNavigateToCompare && (
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToCompare(scan.id)}
                className="inline-flex items-center gap-1.5 bg-white border border-app-border hover:border-app-secondary text-app-primary text-xs font-medium px-3.5 py-2 rounded-[6px] transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>View Baseline Diff</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLoadRemediation}
              className="inline-flex items-center gap-1.5 bg-white border border-app-border hover:border-app-secondary text-app-primary text-xs font-medium px-3.5 py-2 rounded-[6px] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-app-primary" />
              <span>AI Repair Prompt</span>
            </motion.button>
          </div>
        </div>

        {/* Severity Metrics Strip */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-6 gap-3">
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="p-3 bg-app-canvas border border-app-border rounded-[6px] hover:border-app-secondary transition-colors cursor-default"
          >
            <span className="text-[11px] font-mono uppercase text-app-muted block mb-1">Total Issues</span>
            <span className="text-xl font-semibold text-app-primary font-mono">{scan.summary.total}</span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="p-3 bg-red-50/60 border border-red-200 rounded-[6px] hover:border-red-400 transition-colors cursor-default"
          >
            <span className="text-[11px] font-mono uppercase text-red-700 block mb-1">Critical</span>
            <span className="text-xl font-semibold text-red-800 font-mono">{scan.summary.critical}</span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="p-3 bg-amber-50/60 border border-amber-200 rounded-[6px] hover:border-amber-400 transition-colors cursor-default"
          >
            <span className="text-[11px] font-mono uppercase text-amber-700 block mb-1">High</span>
            <span className="text-xl font-semibold text-amber-800 font-mono">{scan.summary.high}</span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="p-3 bg-yellow-50/60 border border-yellow-200 rounded-[6px] hover:border-yellow-400 transition-colors cursor-default"
          >
            <span className="text-[11px] font-mono uppercase text-yellow-700 block mb-1">Medium</span>
            <span className="text-xl font-semibold text-yellow-800 font-mono">{scan.summary.medium}</span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="p-3 bg-blue-50/60 border border-blue-200 rounded-[6px] hover:border-blue-400 transition-colors cursor-default"
          >
            <span className="text-[11px] font-mono uppercase text-blue-700 block mb-1">Low</span>
            <span className="text-xl font-semibold text-blue-800 font-mono">{scan.summary.low}</span>
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="p-3 bg-neutral-100 border border-neutral-200 rounded-[6px] hover:border-neutral-400 transition-colors cursor-default"
          >
            <span className="text-[11px] font-mono uppercase text-neutral-600 block mb-1">Info</span>
            <span className="text-xl font-semibold text-neutral-800 font-mono">{scan.summary.info}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Incomplete Coverage Warning */}
      {hasIncompleteCoverage && (
        <motion.div variants={itemVariants} className="mb-6 p-4 rounded-[6px] bg-app-warning-bg border border-app-warning-border text-xs text-app-warning flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Incomplete Coverage Warning</div>
            <div>
              Some scanners failed to complete ({failedScanners.map((s) => s.scanner).join(', ')}).
              Findings from successful tools are shown below, but this repository cannot be certified clean until all engines pass.
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Sub-Tabs */}
      <motion.div variants={itemVariants} className="flex border-b border-app-border mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`relative py-2.5 px-4 text-xs font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-app-primary font-semibold'
              : 'text-app-secondary hover:text-app-primary'
          }`}
        >
          <span>Overview & Scanners</span>
          {activeTab === 'overview' && (
            <motion.div
              layoutId="activeReportTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-primary"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`relative py-2.5 px-4 text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'findings'
              ? 'text-app-primary font-semibold'
              : 'text-app-secondary hover:text-app-primary'
          }`}
        >
          <span>Finding Explorer</span>
          <span className="px-1.5 py-0.2 rounded-full bg-app-canvas border border-app-border text-[10px] font-mono">
            {scan.findings.length}
          </span>
          {activeTab === 'findings' && (
            <motion.div
              layoutId="activeReportTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-primary"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
        </button>
        <button
          onClick={handleLoadRemediation}
          className={`relative py-2.5 px-4 text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'remediation'
              ? 'text-app-primary font-semibold'
              : 'text-app-secondary hover:text-app-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Repair & Remediation</span>
          {activeTab === 'remediation' && (
            <motion.div
              layoutId="activeReportTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-app-primary"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Scanner Execution Audit Grid */}
            <div className="bg-white border border-app-border rounded-[6px] overflow-hidden">
              <div className="px-5 py-3 bg-app-canvas border-b border-app-border flex items-center justify-between text-xs font-mono font-medium text-app-secondary">
                <span>SCANNER EXECUTION AUDIT</span>
                <span>RESULTS</span>
              </div>

              <div className="divide-y divide-app-border">
                {scan.scannersRun.map((sr) => (
                  <motion.div
                    key={sr.scanner}
                    whileHover={{ x: 2, transition: { duration: 0.15 } }}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-app-hover/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-app-primary uppercase font-mono">
                          {sr.scanner}
                        </span>
                        {sr.executed ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-app-success-bg text-app-success border border-app-success-border">
                            ONLINE & EXECUTED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-app-error-bg text-app-error border border-app-error-border">
                            UNAVAILABLE / FAILED
                          </span>
                        )}
                      </div>
                      {sr.error && (
                        <p className="text-xs text-app-error font-mono mt-1">Error: {sr.error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-app-muted">{sr.executionTimeMs}ms</span>
                      <span className="font-semibold text-app-primary">
                        {sr.findingsCount} findings
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Clean Scan Zero Findings State */}
            {scan.summary.total === 0 && !hasIncompleteCoverage && (
              <div className="bg-white border border-app-border rounded-[6px] p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-app-success mx-auto mb-3" />
                <h2 className="text-lg font-medium text-app-primary mb-1">
                  No Findings Detected by Completed Scanners
                </h2>
                <p className="text-xs text-app-secondary max-w-md mx-auto mb-6">
                  All configured scanners executed cleanly across {scan.fileCount} files without detecting hardcoded credentials, known dependency CVEs, or AST vulnerability patterns.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onInitiateRescan(scan.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-app-canvas border border-app-border rounded-[6px] text-xs font-medium hover:border-app-secondary text-app-primary"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Verification Rescan</span>
                </motion.button>
              </div>
            )}

            {/* Quick link to Findings */}
            {scan.summary.total > 0 && (
              <motion.div
                whileHover={{ y: -1 }}
                className="p-4 bg-app-canvas border border-app-border rounded-[6px] flex items-center justify-between"
              >
                <span className="text-xs text-app-body">
                  {scan.summary.total} verified security issues require developer remediation.
                </span>
                <button
                  onClick={() => setActiveTab('findings')}
                  className="text-xs font-semibold text-app-primary hover:underline flex items-center gap-1"
                >
                  <span>Open Finding Explorer</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Tab 2: Findings Explorer */}
        {activeTab === 'findings' && (
          <motion.div
            key="findings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Filter and Search Bar */}
            <div className="bg-white border border-app-border rounded-[6px] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-app-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rule, file path, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-app-canvas border border-app-border rounded-[6px] text-xs text-app-primary focus:outline-none focus:border-app-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-app-canvas border border-app-border rounded-[6px] text-xs text-app-primary font-mono focus:outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                </select>

                <select
                  value={scannerFilter}
                  onChange={(e) => setScannerFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-app-canvas border border-app-border rounded-[6px] text-xs text-app-primary font-mono focus:outline-none"
                >
                  <option value="all">All Scanners</option>
                  <option value="gitleaks">Gitleaks</option>
                  <option value="semgrep">Semgrep</option>
                  <option value="trivy">Trivy</option>
                  <option value="rule-engine">Heuristic Engine</option>
                  <option value="url-inspector">URL Inspector</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-app-canvas border border-app-border rounded-[6px] text-xs text-app-primary font-mono focus:outline-none"
                >
                  <option value="severity">Sort by Severity</option>
                  <option value="file">Sort by File Path</option>
                  <option value="scanner">Sort by Scanner</option>
                </select>
              </div>
            </div>

            {/* Finding Cards List */}
            {filteredFindings.length === 0 ? (
              <div className="bg-white border border-app-border rounded-[6px] p-8 text-center text-xs text-app-muted">
                No findings matched your search and filter criteria.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredFindings.map((f) => (
                  <motion.div
                    key={f.id}
                    onClick={() => onSelectFinding(f)}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    className="bg-white border border-app-border hover:border-app-secondary rounded-[6px] p-4 transition-all hover:shadow-app-card cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-app-border/60 gap-2">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="font-semibold text-xs text-app-primary">{f.title}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-app-muted">
                        <span className="uppercase">{f.scanner}</span>
                        <span>·</span>
                        <span>{f.ruleId}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs text-app-secondary">
                        <FileCode className="w-3.5 h-3.5 text-app-muted" />
                        <span className="text-app-primary">{f.filePath}</span>
                        {f.startLine && (
                          <span className="text-app-muted">line {f.startLine}{f.endLine && f.endLine !== f.startLine ? `–${f.endLine}` : ''}</span>
                        )}
                      </div>

                      <span className="text-xs text-app-secondary flex items-center gap-1 hover:text-app-primary self-end sm:self-center font-medium">
                        <span>Inspect Evidence & Fix</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Masked snippet preview */}
                    {f.snippet && (
                      <div className="mt-2.5 p-2 bg-app-canvas rounded border border-app-border font-mono text-[11px] text-app-secondary overflow-x-auto whitespace-pre">
                        {f.snippet}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 3: AI Remediation & Coding Agent Prompt */}
        {activeTab === 'remediation' && (
          <motion.div
            key="remediation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Executive Summary */}
            {remediationPlan ? (
              <>
                <div className="bg-white border border-app-border rounded-[6px] p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-app-border mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-app-primary" />
                      <h2 className="text-sm font-semibold text-app-primary uppercase tracking-tight">
                        Security Remediation Plan
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-app-muted">Provider: </span>
                      <span className="px-2 py-0.5 rounded bg-app-canvas border border-app-border text-app-primary font-semibold">
                        {remediationPlan.generatedBy === 'gemini' ? 'Google Gemini AI' : 'Deterministic Engine'}
                      </span>
                      <span className="text-app-muted ml-2">Risk Score: </span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold">
                        {remediationPlan.riskScore}/100
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-app-body leading-relaxed mb-4">
                    {remediationPlan.executiveSummary}
                  </p>

                  {/* Credential Revocation Alerts */}
                  {remediationPlan.credentialRotations.length > 0 && (
                    <div className="mt-4 p-4 rounded-[6px] bg-red-50 border border-red-200">
                      <div className="text-xs font-bold text-red-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>MANDATORY CREDENTIAL REVOCATION DIRECTIVES</span>
                      </div>
                      <ul className="space-y-2 text-xs text-red-800 list-disc list-inside">
                        {remediationPlan.credentialRotations.map((cr, idx) => (
                          <li key={idx}>
                            <strong>{cr.credentialType}</strong> detected in <code className="font-mono text-red-950">{cr.detectedFile}</code>:
                            {' '}{cr.immediateActions.join(' · ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Ready to Paste Coding Agent Prompt */}
                <div className="bg-white border border-app-border rounded-[6px] p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-app-border gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-app-primary flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-app-primary" />
                        <span>Ready-to-Paste Coding Agent Repair Prompt</span>
                      </h3>
                      <p className="text-xs text-app-muted mt-0.5">
                        Structured specifically for Claude Code, Cursor, Aider, or GitHub Copilot.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopyPrompt}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-app-primary text-white hover:bg-neutral-800 rounded-[6px] text-xs font-medium transition-colors"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-app-success" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDownloadPrompt}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-app-border hover:border-app-secondary rounded-[6px] text-xs font-medium text-app-primary transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export .md</span>
                      </motion.button>
                    </div>
                  </div>

                  <div className="bg-app-canvas border border-app-border rounded-[6px] p-4 overflow-x-auto max-h-[460px] overflow-y-auto">
                    <pre className="text-xs font-mono text-app-body leading-relaxed whitespace-pre-wrap select-all">
                      {remediationPlan.readyToPasteRepairPrompt}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border border-app-border rounded-[6px] p-12 text-center">
                <Sparkles className="w-10 h-10 text-app-secondary mx-auto mb-3 animate-pulse" />
                <h3 className="text-sm font-semibold text-app-primary mb-1">
                  {isLoadingRemediation ? 'Generating AI Remediation Plan...' : 'Generate AI Remediation Guidance'}
                </h3>
                <p className="text-xs text-app-secondary max-w-md mx-auto mb-6">
                  Passes sanitized findings to configured model to create prioritized instructions and ready-to-paste agent prompts.
                </p>
                {!isLoadingRemediation && (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoadRemediation}
                    className="px-4 py-2 bg-app-primary text-white text-xs font-medium rounded-[6px] hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    Generate Plan Now
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
