import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanRecord, ScannerReadiness } from '../types';
import {
  ChevronDown,
  History,
  FileText,
  GitCompare,
  Plus,
} from 'lucide-react';

interface AppHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  activeScan: ScanRecord | null;
  scans: ScanRecord[];
  onSelectScan: (scan: ScanRecord) => void;
  readiness?: ScannerReadiness | null;
}

export function AppHeader({
  currentPath,
  onNavigate,
  activeScan,
  scans,
  onSelectScan,
  readiness,
}: AppHeaderProps) {
  const isNewScan = currentPath === '/scanner/new' || currentPath === '/scanner';
  const isReport = currentPath.startsWith('/scans/') && !currentPath.endsWith('/compare');
  const isCompare = currentPath.includes('/compare');
  const isHistory = currentPath === '/history';
  const [showEngineDropdown, setShowEngineDropdown] = useState(false);

  const enginesInstalled = (readiness?.gitleaks?.installed ? 1 : 0) +
    (readiness?.semgrep?.installed ? 1 : 0) +
    (readiness?.trivy?.installed ? 1 : 0);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80 h-14 px-6 flex items-center justify-between select-none">
      <div className="flex items-center gap-6">
        {/* Brand identity */}
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Return to Landing Page"
        >
          <div className="w-6 h-6 bg-black rounded-[5px] flex items-center justify-center text-white shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M7.5 18L13.5 6M12.5 18L18.5 6" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900 group-hover:text-black">
            Obsyra
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex items-center gap-1 text-xs">
          <button
            onClick={() => onNavigate('/scanner/new')}
            className={`px-3 py-1.5 rounded-[6px] transition-colors font-medium ${
              isNewScan
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            New scan
          </button>

          <button
            onClick={() => onNavigate('/history')}
            className={`px-3 py-1.5 rounded-[6px] transition-colors font-medium ${
              isHistory
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            History
          </button>

          {isReport && (
            <button
              onClick={() => activeScan && onNavigate(`/scans/${activeScan.id}`)}
              className="px-3 py-1.5 rounded-[6px] bg-neutral-100 text-neutral-900 font-medium"
            >
              Report
            </button>
          )}

          {isCompare && (
            <button
              onClick={() => activeScan && onNavigate(`/scans/${activeScan.id}/compare`)}
              className="px-3 py-1.5 rounded-[6px] bg-neutral-100 text-neutral-900 font-medium"
            >
              Compare
            </button>
          )}
        </nav>
      </div>

      {/* Right Controls: Engine Readiness Pill & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Engines status badge pill */}
        <div className="relative">
          <button
            onClick={() => setShowEngineDropdown((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-mono text-neutral-700 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${enginesInstalled > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span>{enginesInstalled}/3 engines</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          <AnimatePresence>
            {showEngineDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-white border border-neutral-200 rounded-[8px] p-3 shadow-lg z-50 text-xs font-sans space-y-2.5"
              >
                <div className="text-[11px] font-mono uppercase text-neutral-400 font-semibold border-b border-neutral-100 pb-1.5">
                  Scanner Status
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${readiness?.gitleaks?.installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    Gitleaks
                  </span>
                  <span className="text-neutral-400 text-[11px]">
                    {readiness?.gitleaks?.installed ? 'installed' : 'not installed'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${readiness?.semgrep?.installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    Semgrep
                  </span>
                  <span className="text-neutral-400 text-[11px]">
                    {readiness?.semgrep?.installed ? 'installed' : 'AST Heuristic'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${readiness?.trivy?.installed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    Trivy
                  </span>
                  <span className="text-neutral-400 text-[11px]">
                    {readiness?.trivy?.installed ? 'installed' : 'not installed'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

