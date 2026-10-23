import React from 'react';
import { ScannerReadiness } from '../types';
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ScannerReadinessBannerProps {
  readiness: ScannerReadiness | null;
  onRefresh?: () => void;
}

export const ScannerReadinessBanner: React.FC<ScannerReadinessBannerProps> = ({ readiness }) => {
  if (!readiness) return null;

  const scanners = [
    {
      name: 'Gitleaks',
      role: 'Secret Leaks',
      installed: readiness.gitleaks.installed,
      version: readiness.gitleaks.version,
    },
    {
      name: 'Semgrep',
      role: 'SAST Analysis',
      installed: readiness.semgrep.installed,
      version: readiness.semgrep.version,
    },
    {
      name: 'Trivy',
      role: 'CVEs & Config',
      installed: readiness.trivy.installed,
      version: readiness.trivy.version,
    },
    {
      name: 'URL Auditor',
      role: 'Headers & Cookies',
      installed: readiness.urlInspector.installed,
      version: readiness.urlInspector.version,
    },
    {
      name: 'Rule Engine',
      role: 'Heuristic AST',
      installed: true,
      version: 'Built-in Fallback Rule Engine v1.0',
    },
  ];

  return (
    <div className="w-full bg-vanta-950 border-b border-white/[0.06] px-4 py-1.5 text-[11px] text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-brand-orange" />
          <span className="font-semibold text-slate-300 tracking-wide uppercase text-[10px]">
            Security Engine Telemetry:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          {scanners.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-1.5 group cursor-default"
              title={s.version || `${s.name} executable not in PATH. Fallback rule engine active.`}
            >
              {s.installed ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              ) : (
                <span className="inline-flex rounded-full h-2 w-2 bg-amber-500/80" />
              )}
              <span className="font-medium text-slate-300">{s.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold tracking-wider uppercase ${
                  s.installed
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {s.installed ? 'ONLINE' : 'STANDBY'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
