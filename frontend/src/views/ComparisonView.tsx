import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanRecord, ComparisonResult } from '../types';
import { rescanProject, fetchComparison, runDemoScan } from '../api/client';
import {
  GitCompare,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Sparkles,
  Loader2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  HelpCircle,
  Clock,
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

interface ComparisonViewProps {
  scan: ScanRecord | null;
  scans: ScanRecord[];
  onScanCompleted: (scan: ScanRecord) => void;
  onNavigateToReport?: (scanId: string) => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function ComparisonView({
  scan,
  scans,
  onScanCompleted,
  onNavigateToReport,
  showToast,
}: ComparisonViewProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isRescanning, setIsRescanning] = useState(false);
  const [rescanFile, setRescanFile] = useState<File | null>(null);

  useEffect(() => {
    if (!scan) return;

    async function loadExistingComparison() {
      // If active scan was a rescan
      if (scan!.baselineScanId) {
        try {
          const comp = await fetchComparison(`cmp-${scan!.baselineScanId.substring(0, 8)}-${scan!.id.substring(0, 8)}`);
          setComparison(comp);
          return;
        } catch {
          // fallback
        }
      }

      // Check if another scan rescanned this scan
      const childRescan = scans.find((s) => s.baselineScanId === scan!.id);
      if (childRescan) {
        try {
          const comp = await fetchComparison(`cmp-${scan!.id.substring(0, 8)}-${childRescan.id.substring(0, 8)}`);
          setComparison(comp);
        } catch {
          // ignore
        }
      } else {
        setComparison(null);
      }
    }

    loadExistingComparison();
  }, [scan, scans]);

  const handleRescanUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan) return;
    if (!rescanFile) {
      showToast('error', 'Please select a patched source-code ZIP archive.');
      return;
    }

    setIsRescanning(true);
    try {
      const formData = new FormData();
      formData.append('file', rescanFile);
      formData.append('projectName', `${scan.projectName} (Verified Fixes)`);

      const res = await rescanProject(scan.id, formData);
      setComparison(res.comparison);
      onScanCompleted(res.scan);
      showToast('success', `Rescan verification complete: ${res.comparison.summary.resolvedCount} fixes verified.`);
    } catch (err: any) {
      showToast('error', `Rescan failed: ${err.message}`);
    } finally {
      setIsRescanning(false);
    }
  };

  const handle1ClickCorrectedDemo = async () => {
    if (!scan) return;
    setIsRescanning(true);
    try {
      showToast('info', 'Running patched verification rescan...');
      const res = await runDemoScan('corrected', scan.id);
      if (res.comparison) {
        setComparison(res.comparison);
      }
      onScanCompleted(res.scan);
      showToast('success', '1-Click Corrected verification completed.');
    } catch (err: any) {
      showToast('error', `Demo rescan failed: ${err.message}`);
    } finally {
      setIsRescanning(false);
    }
  };

  if (!scan) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <GitCompare className="w-10 h-10 text-app-muted mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-app-primary mb-1">No Baseline Selected</h2>
        <p className="text-xs text-app-secondary">
          Select or open a baseline scan to compare patched code against detected vulnerabilities.
        </p>
      </div>
    );
  }

  const items = comparison?.items || [];
  const filteredItems = items.filter((item) => {
    if (selectedStatusFilter === 'all') return true;
    return item.status === selectedStatusFilter;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="bg-white border border-app-border rounded-[6px] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-app-border gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase text-app-muted">VERIFICATION DIFF</span>
              <span className="font-mono text-xs text-app-primary bg-app-canvas px-2 py-0.5 rounded border border-app-border break-all max-w-full">
                Baseline: {scan.projectName} ({scan.id})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-app-primary tracking-tight">
              Rescan Fix Verification
            </h1>
            <p className="text-xs text-app-secondary mt-1">
              Compare patched code against baseline findings. Findings are matched using stable structural fingerprints.
            </p>
          </div>

          {!comparison && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handle1ClickCorrectedDemo}
              disabled={isRescanning}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-app-primary text-white hover:bg-neutral-800 disabled:opacity-50 text-xs font-medium rounded-[6px] transition-colors shadow-sm w-full sm:w-auto shrink-0"
            >
              {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Run Sample Patched Rescan</span>
            </motion.button>
          )}
        </div>

        {/* Comparison Metrics */}
        {comparison && (
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 font-mono">
            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="p-3 sm:p-3.5 bg-app-success-bg border border-app-success-border rounded-[6px] cursor-default"
            >
              <div className="flex items-center gap-1.5 text-xs text-app-success font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>RESOLVED</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-app-success">{comparison.summary.resolvedCount}</span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="p-3 sm:p-3.5 bg-neutral-100 border border-neutral-300 rounded-[6px] cursor-default"
            >
              <div className="flex items-center gap-1.5 text-xs text-neutral-700 font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>STILL PRESENT</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-neutral-800">{comparison.summary.stillPresentCount}</span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="p-3 sm:p-3.5 bg-app-warning-bg border border-app-warning-border rounded-[6px] cursor-default"
            >
              <div className="flex items-center gap-1.5 text-xs text-app-warning font-semibold mb-1">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>NEW FINDINGS</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-app-warning">{comparison.summary.newCount}</span>
            </motion.div>

            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="p-3 sm:p-3.5 bg-app-info-bg border border-app-info-border rounded-[6px] cursor-default"
            >
              <div className="flex items-center gap-1.5 text-xs text-app-info font-semibold mb-1">
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span>INCONCLUSIVE</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-app-info">{comparison.summary.inconclusiveCount}</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Coverage Difference Warnings */}
      {comparison && comparison.summary.scannerCoverageNotes.length > 0 && (
        <motion.div variants={itemVariants} className="p-4 rounded-[6px] bg-app-warning-bg border border-app-warning-border text-xs text-app-warning flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Defensive Coverage Guarantee Note</div>
            <ul className="list-disc list-inside space-y-1">
              {comparison.summary.scannerCoverageNotes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* If No Rescan Yet: Upload Dropzone & Demo Launcher */}
      {!comparison && (
        <motion.div variants={itemVariants} className="bg-white border border-app-border rounded-[6px] p-8 max-w-xl mx-auto text-center space-y-6">
          <div className="w-12 h-12 rounded-[6px] bg-app-canvas border border-app-border text-app-primary flex items-center justify-center mx-auto">
            <GitCompare className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-app-primary mb-1">Verify Patched Code Against Baseline</h2>
            <p className="text-xs text-app-secondary max-w-sm mx-auto">
              Upload the revised source ZIP archive containing your fixes to verify resolutions and ensure no regressions occurred.
            </p>
          </div>

          <form onSubmit={handleRescanUpload} className="space-y-4">
            <div className="p-4 rounded-[6px] border border-dashed border-app-border bg-app-canvas text-center hover:border-app-secondary transition-colors">
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setRescanFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-app-secondary file:mr-4 file:py-1.5 file:px-3 file:rounded-[6px] file:border file:border-app-border file:text-xs file:font-medium file:bg-white file:text-app-primary hover:file:bg-app-hover cursor-pointer"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isRescanning || !rescanFile}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-app-primary text-white text-xs font-medium rounded-[6px] hover:bg-neutral-800 disabled:opacity-40 transition-colors shadow-sm"
            >
              {isRescanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{isRescanning ? 'Scanning Corrected Source...' : 'Upload & Verify Patched Code'}</span>
            </motion.button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-app-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono text-app-muted">
              <span className="bg-white px-2">Or test synthetic demo</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handle1ClickCorrectedDemo}
            disabled={isRescanning}
            className="w-full py-2 px-4 rounded-[6px] border border-app-border hover:border-app-secondary bg-white text-app-primary text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test with Pre-Packaged Corrected Demo Fixture</span>
          </motion.button>
        </motion.div>
      )}

      {/* Comparison Item List */}
      {comparison && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 pb-2 border-b border-app-border overflow-x-auto no-scrollbar whitespace-nowrap">
            {['all', 'resolved', 'still_present', 'new', 'inconclusive'].map((status) => (
              <motion.button
                key={status}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStatusFilter(status)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-mono font-medium transition-colors shrink-0 ${
                  selectedStatusFilter === status
                    ? 'bg-app-primary text-white shadow-xs'
                    : 'bg-white border border-app-border text-app-secondary hover:text-app-primary'
                }`}
              >
                {status.toUpperCase().replace('_', ' ')}
              </motion.button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white border border-app-border rounded-[6px] p-8 text-center text-xs text-app-muted">
              No comparison items matching filter &apos;{selectedStatusFilter}&apos;.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="bg-white border border-app-border hover:border-app-secondary rounded-[6px] p-4 sm:p-5 space-y-3 transition-all hover:shadow-app-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-app-border gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.status === 'resolved' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-app-success-bg text-app-success border border-app-success-border shrink-0">
                          RESOLVED
                        </span>
                      )}
                      {item.status === 'still_present' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-800 border border-neutral-300 shrink-0">
                          STILL PRESENT
                        </span>
                      )}
                      {item.status === 'new' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-app-warning-bg text-app-warning border border-app-warning-border shrink-0">
                          NEW
                        </span>
                      )}
                      {item.status === 'inconclusive' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-app-info-bg text-app-info border border-app-info-border shrink-0">
                          INCONCLUSIVE
                        </span>
                      )}
                      <span className="font-semibold text-xs text-app-primary break-words">{item.title}</span>
                    </div>

                    <div className="text-[11px] font-mono text-app-muted shrink-0">
                      <span>{item.category}</span>
                      <span> · </span>
                      <span className="uppercase">{item.scanner}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-app-secondary break-all">
                    <FileCode className="w-3.5 h-3.5 text-app-muted shrink-0" />
                    <span>{item.filePath}</span>
                    {item.startLine && <span className="text-app-muted">line {item.startLine}</span>}
                  </div>

                  <p className="text-xs text-app-body leading-relaxed">
                    {item.reason}
                  </p>

                  {/* Masked snippet evidence if present */}
                  {item.baselineFinding?.snippet && (
                    <div className="p-2.5 bg-app-canvas border border-app-border rounded-[6px] font-mono text-[11px] text-app-secondary overflow-x-auto whitespace-pre">
                      <div className="text-[10px] uppercase font-mono text-app-muted mb-1">Baseline Code Evidence:</div>
                      {item.baselineFinding.snippet}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
