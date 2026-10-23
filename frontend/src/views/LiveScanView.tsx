import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveScanState, ScanRecord } from '../types';
import { fetchScanStatus } from '../api/client';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Terminal,
  FileCode2,
  RotateCcw,
} from 'lucide-react';

interface LiveScanViewProps {
  scanId: string;
  onOpenReport: (scanId: string) => void;
  onNavigateToIntake: () => void;
  onScanCompleted?: (scan: ScanRecord) => void;
}

export function LiveScanView({
  scanId,
  onOpenReport,
  onNavigateToIntake,
  onScanCompleted,
}: LiveScanViewProps) {
  const [state, setState] = useState<LiveScanState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let intervalId: any = null;
    let isMounted = true;

    const poll = async () => {
      try {
        const live = await fetchScanStatus(scanId);
        if (!isMounted) return;
        setState(live);
        setError(null);

        if (live.status === 'completed' || live.status === 'failed') {
          setIsCompleted(true);
          clearInterval(intervalId);
          if (live.completedScan && onScanCompleted) {
            onScanCompleted(live.completedScan);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to poll scan status');
      }
    };

    poll();
    intervalId = setInterval(poll, 600);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [scanId]);

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-app-success" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-app-primary animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-app-error" />;
      case 'skipped':
        return <AlertTriangle className="w-4 h-4 text-app-warning" />;
      default:
        return <Clock className="w-4 h-4 text-app-muted" />;
    }
  };

  const getStageBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-app-success-bg text-app-success border border-app-success-border">COMPLETED</span>;
      case 'running':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-100 text-app-primary border border-neutral-300">RUNNING</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-app-error-bg text-app-error border border-app-error-border">FAILED</span>;
      case 'skipped':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-app-warning-bg text-app-warning border border-app-warning-border">SKIPPED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-app-canvas text-app-muted border border-app-border">PENDING</span>;
    }
  };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
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

  const completedStagesCount = state?.stages?.filter((s) => s.status === 'completed').length || 0;
  const totalStagesCount = state?.stages?.length || 4;
  const progressPercent = isCompleted ? 100 : Math.min(92, Math.max(12, Math.round((completedStagesCount / totalStagesCount) * 100)));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10"
    >
      {/* Animated Live Progress Bar */}
      <motion.div variants={itemVariants} className="w-full bg-neutral-200/80 h-1.5 rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-black rounded-full"
          initial={{ width: '8%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </motion.div>

      {/* Header telemetry info */}
      <motion.div
        variants={itemVariants}
        className="bg-white border border-app-border rounded-[6px] p-4 sm:p-6 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-app-border gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs text-app-muted uppercase">SCAN EXECUTION</span>
              <span className="font-mono text-xs text-app-primary font-medium">{scanId}</span>
            </div>
            <h1 className="text-xl font-semibold text-app-primary tracking-tight break-all">
              {state?.projectName || 'Analyzing Project Workspace'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-center">
            <div className="px-3 py-1.5 rounded-[6px] bg-app-canvas border border-app-border font-mono text-xs">
              <span className="text-app-muted">Elapsed: </span>
              <span className="font-semibold text-app-primary">
                {state ? `${(state.elapsedMs / 1000).toFixed(2)}s` : '0.00s'}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-[6px] bg-app-canvas border border-app-border font-mono text-xs">
              <span className="text-app-muted">Findings: </span>
              <span className="font-semibold text-app-primary">
                {state?.findingsCount ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Status Callout */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-2.5">
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-app-success shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-app-primary animate-spin shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="text-xs font-semibold text-app-primary">
                {isCompleted
                  ? state?.status === 'failed'
                    ? 'Scan Encountered Errors'
                    : 'Analysis & Synthesis Completed'
                  : 'Multi-Scanner Pipeline In Progress'}
              </div>
              <div className="text-[11px] text-app-secondary">
                {isCompleted
                  ? 'All configured tools have finished execution and normalized findings are ready for review.'
                  : 'Orchestrating Gitleaks, Semgrep, Trivy, and rule engine across codebase...'}
              </div>
            </div>
          </div>

          {isCompleted && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenReport(scanId)}
              className="inline-flex items-center justify-center gap-2 bg-app-primary text-white hover:bg-neutral-800 text-xs font-medium px-4 py-2 rounded-[6px] shadow-sm transition-all whitespace-nowrap w-full sm:w-auto"
            >
              <span>View Security Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-6 p-4 rounded-[6px] bg-app-error-bg border border-app-error-border text-xs text-app-error flex items-start gap-3 shadow-xs"
          >
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold mb-0.5">Telemetry Error</div>
              <div>{error}</div>
            </div>
            <button
              onClick={() => onNavigateToIntake()}
              className="text-xs font-medium underline text-app-error"
            >
              Return to Intake
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real Stage Telemetry List */}
      <motion.div
        variants={itemVariants}
        className="bg-white border border-app-border rounded-[6px] divide-y divide-app-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
      >
        <div className="px-5 py-3 bg-app-canvas flex items-center justify-between text-xs font-mono font-medium text-app-secondary">
          <span>PIPELINE STAGE</span>
          <span>STATUS & TELEMETRY</span>
        </div>

        {state?.stages?.map((stage) => (
          <motion.div
            key={stage.id}
            whileHover={{ x: 2, transition: { duration: 0.15 } }}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-app-hover/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getStageIcon(stage.status)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-app-primary">{stage.name}</span>
                  <span className="text-xs text-app-muted font-mono">{stage.label}</span>
                </div>
                <p className="text-xs text-app-secondary mt-0.5 max-w-xl">
                  {stage.description}
                </p>
                {stage.error && (
                  <p className="text-xs text-app-error mt-1 font-mono">
                    Scanner Note: {stage.error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 self-end sm:self-center font-mono text-xs">
              {stage.durationMs !== undefined && (
                <span className="text-app-muted">{stage.durationMs}ms</span>
              )}
              {stage.findingsCount !== undefined && stage.findingsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[11px] font-semibold">
                  +{stage.findingsCount} findings
                </span>
              )}
              {getStageBadge(stage.status)}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Actions */}
      <motion.div variants={itemVariants} className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onNavigateToIntake}
          className="text-xs text-app-secondary hover:text-app-primary underline py-1"
        >
          Cancel or Submit Another Scan
        </button>

        {isCompleted && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOpenReport(scanId)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-app-primary hover:underline py-1"
          >
            <span>Proceed to Report Overview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
