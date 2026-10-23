import React, { useState } from 'react';
import { ScanRecord } from '../types';
import {
  Shield,
  Sparkles,
  FolderUp,
  LayoutDashboard,
  SearchCode,
  Wrench,
  GitCompare,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

export type NavTab = 'workspace' | 'overview' | 'findings' | 'remediation' | 'comparison';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeScan: ScanRecord | null;
  scans: ScanRecord[];
  onSelectScan: (scan: ScanRecord) => void;
  onNavigateHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  activeScan,
  scans,
  onSelectScan,
  onNavigateHome,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'workspace', label: 'Intake', icon: <FolderUp className="w-3.5 h-3.5" /> },
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    {
      id: 'findings',
      label: 'Findings',
      icon: <SearchCode className="w-3.5 h-3.5" />,
      badge: activeScan?.findings.length,
    },
    { id: 'remediation', label: 'AI Remediation', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'comparison', label: 'Rescan Diff', icon: <GitCompare className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-vanta-950/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand Identity & Home Link */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2.5 text-left group hover:opacity-90 transition-opacity"
              title="Return to Landing Page"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange/20 to-amber-500/10 border border-brand-orange/30 text-brand-orange shadow-glow-sm">
                <Shield className="w-5 h-5 text-brand-orange" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-white text-base">Obsyra</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                    <Sparkles className="w-2.5 h-2.5 text-brand-orange" />
                    Scanner
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Security Review & Verification</p>
              </div>
            </button>
          </div>

          {/* Center: Segmented Navigation Pill Bar */}
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-vanta-900 border border-white/[0.06] shadow-inner">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const isDisabled = !activeScan && tab.id !== 'workspace';

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && onTabChange(tab.id)}
                  disabled={isDisabled}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-orange text-white shadow-glow-sm'
                      : isDisabled
                      ? 'text-slate-600 cursor-not-allowed opacity-40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-none ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-vanta-800 text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Active Project / Scan Context Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            {activeScan ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vanta-900 hover:bg-vanta-850 border border-white/[0.08] text-xs transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <div className="text-left leading-tight hidden sm:block">
                    <p className="font-semibold text-white truncate max-w-[130px]">{activeScan.projectName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{activeScan.id}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {activeScan.summary.total} {activeScan.summary.total === 1 ? 'issue' : 'issues'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 py-1.5 bg-vanta-900 border border-vanta-750 rounded-xl shadow-2xl z-50 animate-fade-in divide-y divide-white/[0.06]">
                    <div className="px-3.5 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Available Scan Reviews
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {scans.map((s) => {
                        const isCurrent = s.id === activeScan.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              onSelectScan(s);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-white/[0.05] transition-colors ${
                              isCurrent ? 'bg-brand-orange/15 text-amber-300' : 'text-slate-300'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <p className="font-semibold truncate text-white">{s.projectName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {s.fileCount} files
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vanta-800 text-slate-300 border border-white/[0.06]">
                                {s.summary.total} issues
                              </span>
                              {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-mono px-2 py-1 rounded bg-vanta-900 border border-white/[0.06]">
                No Active Review
              </span>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs (Shown on small screens) */}
        <div className="flex md:hidden items-center justify-between pb-3 pt-1 border-t border-white/[0.06] overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const isDisabled = !activeScan && tab.id !== 'workspace';
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && onTabChange(tab.id)}
                disabled={isDisabled}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-brand-orange text-white'
                    : isDisabled
                    ? 'text-slate-600 cursor-not-allowed opacity-40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="text-[9px] font-mono px-1 rounded-full bg-white/20">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
