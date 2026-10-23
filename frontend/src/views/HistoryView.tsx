import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanRecord } from '../types';
import { fetchScans, deleteScan } from '../api/client';
import {
  History,
  FileCode2,
  Trash2,
  ArrowRight,
  RefreshCw,
  GitCompare,
  PlusCircle,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

interface HistoryViewProps {
  onOpenReport: (scanId: string) => void;
  onInitiateRescan: (baselineScanId: string) => void;
  onNavigateToCompare?: (scanId: string) => void;
  onNavigateToIntake: () => void;
  showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function HistoryView({
  onOpenReport,
  onInitiateRescan,
  onNavigateToCompare,
  onNavigateToIntake,
  showToast,
}: HistoryViewProps) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const list = await fetchScans();
      setScans(list);
    } catch (err: any) {
      showToast('error', 'Failed to retrieve scan history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete scan record '${name}' (${id})?`)) return;
    try {
      await deleteScan(id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      showToast('info', `Scan ${id} deleted.`);
    } catch (err: any) {
      showToast('error', 'Failed to delete scan record');
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-app-border gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-app-primary mb-1">
            Scan History
          </h1>
          <p className="text-xs text-app-secondary">
            Persisted security review audits and rescan baseline comparisons from local SQLite.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNavigateToIntake}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-app-primary text-white hover:bg-neutral-800 text-xs font-medium rounded-[6px] transition-colors shadow-sm w-full sm:w-auto shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Scan</span>
        </motion.button>
      </motion.div>

      {isLoading ? (
        <div className="bg-white border border-app-border rounded-[6px] p-12 text-center text-xs text-app-muted">
          Loading scan history...
        </div>
      ) : scans.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-white border border-app-border rounded-[6px] p-8 sm:p-12 text-center">
          <History className="w-10 h-10 text-app-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-app-primary mb-1">No Past Scans Found</h3>
          <p className="text-xs text-app-secondary mb-6">
            Run an initial project scan to record baseline security reports.
          </p>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNavigateToIntake}
            className="px-4 py-2 bg-app-primary text-white text-xs font-medium rounded-[6px] hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Create First Scan
          </motion.button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-white border border-app-border rounded-[6px] divide-y divide-app-border overflow-hidden">
          <div className="px-4 sm:px-5 py-3 bg-app-canvas flex items-center justify-between text-xs font-mono font-medium text-app-secondary">
            <span>PROJECT & SCAN ID</span>
            <span className="hidden sm:inline">FINDINGS & ACTIONS</span>
          </div>

          {scans.map((scan) => (
            <motion.div
              key={scan.id}
              whileHover={{ x: 2, transition: { duration: 0.15 } }}
              className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-app-hover/50 transition-colors"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-app-primary break-all">{scan.projectName}</span>
                  <span className="font-mono text-xs text-app-muted bg-app-canvas px-2 py-0.5 rounded border border-app-border">
                    {scan.id}
                  </span>
                  {scan.baselineScanId && (
                    <span className="font-mono text-[10px] text-app-info bg-app-info-bg px-2 py-0.5 rounded border border-app-info-border">
                      Rescan baseline: {scan.baselineScanId}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-app-secondary font-mono">
                  <span className="flex items-center gap-1 text-app-muted">
                    <Calendar className="w-3 h-3" />
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </span>
                  <span>·</span>
                  <span>{scan.fileCount} files ({(scan.totalSizeBytes / 1024).toFixed(1)} KB)</span>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{scan.archiveFileName || 'Uploaded Archive'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch md:self-center justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-app-border">
                {/* Severity pill summary */}
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                  {scan.summary.critical > 0 && (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px]">
                      {scan.summary.critical} Crit
                    </span>
                  )}
                  {scan.summary.high > 0 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px]">
                      {scan.summary.high} High
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-app-canvas border border-app-border text-app-primary text-[11px]">
                    {scan.summary.total} Total
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onOpenReport(scan.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-app-primary text-white hover:bg-neutral-800 rounded-[6px] text-xs font-medium transition-colors shadow-xs"
                  >
                    <span>Report</span>
                    <ArrowRight className="w-3 h-3" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onInitiateRescan(scan.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-app-border hover:border-app-secondary text-app-primary rounded-[6px] text-xs font-medium transition-colors"
                    title="Submit updated source and verify fixes against this baseline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">Rescan</span>
                  </motion.button>

                  {scan.baselineScanId && onNavigateToCompare && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onNavigateToCompare(scan.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-app-border hover:border-app-secondary text-app-info rounded-[6px] text-xs font-medium transition-colors"
                      title="View Rescan Comparison"
                    >
                      <GitCompare className="w-3 h-3" />
                      <span className="hidden sm:inline">Diff</span>
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(scan.id, scan.projectName)}
                    className="p-1.5 text-app-muted hover:text-app-error rounded transition-colors"
                    title="Delete scan record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
