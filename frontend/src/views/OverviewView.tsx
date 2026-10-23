import React from 'react';
import { ScanRecord, Finding } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Cpu,
  Fingerprint,
} from 'lucide-react';

interface OverviewViewProps {
  scan: ScanRecord | null;
  onNavigateToFindings: () => void;
  onNavigateToRemediation: () => void;
  onSelectFinding: (finding: Finding) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  scan,
  onNavigateToFindings,
  onNavigateToRemediation,
  onSelectFinding,
}) => {
  if (!scan) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Active Security Scan Context</h2>
        <p className="text-sm text-slate-400">Please upload a source code archive or run a demo in the Intake Workspace.</p>
      </div>
    );
  }

  const { summary, scannersRun, findings } = scan;
  const topRisks = [...findings]
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return (order[b.severity] || 0) - (order[a.severity] || 0);
    })
    .slice(0, 5);

  const categories = Object.entries(summary.byCategory);

  const getCategoryColor = (category: string) => {
    if (category.includes('Secret')) return 'bg-rose-500';
    if (category.includes('Injection') || category.includes('XSS')) return 'bg-orange-500';
    if (category.includes('Access') || category.includes('Auth')) return 'bg-amber-500';
    if (category.includes('Config') || category.includes('Header')) return 'bg-cyan-500';
    return 'bg-brand-orange';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Overview Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{scan.projectName}</h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-vanta-850 text-slate-300 border border-white/[0.08]">
              {scan.id}
            </span>
            {scan.baselineScanId && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Verified Rescan
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Audited on {new Date(scan.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            <span>•</span>
            <span>{scan.fileCount} source files analyzed</span>
            <span>•</span>
            <span>{(scan.totalSizeBytes / 1024).toFixed(1)} KB uncompressed size</span>
          </div>
        </div>

        <button
          onClick={onNavigateToRemediation}
          className="btn-primary-orange flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>Generate AI Repair Prompt</span>
        </button>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-vanta-900/80 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Findings</p>
          <p className="text-3xl font-black text-white font-mono">{summary.total}</p>
          <p className="text-[10px] text-slate-400">Verified evidence items</p>
        </div>

        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-1">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Critical Risk</p>
          <p className="text-3xl font-black text-rose-400 font-mono">{summary.critical}</p>
          <p className="text-[10px] text-rose-300/70">Secrets & RCE</p>
        </div>

        <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-950/20 space-y-1">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">High Risk</p>
          <p className="text-3xl font-black text-orange-400 font-mono">{summary.high}</p>
          <p className="text-[10px] text-orange-300/70">Privilege & Injections</p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Medium Risk</p>
          <p className="text-3xl font-black text-amber-400 font-mono">{summary.medium}</p>
          <p className="text-[10px] text-amber-300/70">Configuration & CORS</p>
        </div>

        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 space-y-1">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Low Risk</p>
          <p className="text-3xl font-black text-blue-400 font-mono">{summary.low}</p>
          <p className="text-[10px] text-blue-300/70">Hardening flags</p>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-vanta-900/80 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Information</p>
          <p className="text-3xl font-black text-slate-300 font-mono">{summary.info}</p>
          <p className="text-[10px] text-slate-400">Telemetry hints</p>
        </div>
      </div>

      {/* Mid Section: Category Distribution & Scanner Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-vanta-900/70 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-orange" />
              <span>Vulnerability Categories</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">{categories.length} Types</span>
          </div>

          <div className="space-y-3.5">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No category findings detected.</p>
            ) : (
              categories.map(([category, count]) => {
                const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                const barColor = getCategoryColor(category);

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{category}</span>
                      <span className="text-slate-300 font-mono font-bold">
                        {count} <span className="text-slate-500 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-vanta-950 overflow-hidden border border-white/[0.04]">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scanner Subprocess Telemetry */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-white/[0.08] bg-vanta-900/70 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Scanner Engine Subprocess Telemetry</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Isolated Executions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {scannersRun.map((s) => (
              <div
                key={s.scanner}
                className="p-4 rounded-xl border border-white/[0.06] bg-vanta-950/60 flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white capitalize">{s.scanner}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                        s.executed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {s.executed ? 'Executed' : s.available ? 'Standby' : 'Not Found'}
                    </span>
                  </div>

                  {s.error ? (
                    <p className="text-[11px] text-rose-400 line-clamp-1" title={s.error}>
                      {s.error}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Execution: <span className="font-mono text-slate-300 font-bold">{s.executionTimeMs}ms</span>
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-black font-mono text-white">{s.findingsCount}</span>
                  <p className="text-[10px] text-slate-400">findings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Security Exposures Requiring Action */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-vanta-900/70 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Top Security Exposures Requiring Action</h3>
            <p className="text-xs text-slate-400">Ranked by risk severity and scanner confidence</p>
          </div>
          <button
            onClick={onNavigateToFindings}
            className="flex items-center gap-1.5 text-xs text-brand-orange hover:text-amber-300 font-bold cursor-pointer"
          >
            <span>View All {findings.length} Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {topRisks.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <span className="text-slate-200 font-semibold">Zero critical or high severity vulnerabilities detected!</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {topRisks.map((f) => (
              <div
                key={f.id}
                onClick={() => onSelectFinding(f)}
                className="p-4 rounded-xl border border-white/[0.06] bg-vanta-950/60 hover:bg-white/[0.03] hover:border-brand-orange/30 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <SeverityBadge severity={f.severity} size="sm" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-white group-hover:text-brand-orange transition-colors truncate">
                      {f.title}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate text-slate-300">
                        {f.filePath}
                        {f.startLine ? `:${f.startLine}` : ''}
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">{f.scanner}</span>
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
