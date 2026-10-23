import React, { useState, useMemo } from 'react';
import { Finding, Severity } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Search, FileCode, ShieldCheck, ArrowRight, X, Filter, Sparkles } from 'lucide-react';

interface FindingsViewProps {
  findings: Finding[];
  onSelectFinding: (finding: Finding) => void;
}

export const FindingsView: React.FC<FindingsViewProps> = ({ findings, onSelectFinding }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedScanner, setSelectedScanner] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    return Array.from(new Set(findings.map((f) => f.category))).sort();
  }, [findings]);

  const scanners = useMemo(() => {
    return Array.from(new Set(findings.map((f) => f.scanner))).sort();
  }, [findings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          f.title.toLowerCase().includes(q) ||
          f.filePath.toLowerCase().includes(q) ||
          f.ruleId.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.snippet && f.snippet.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (selectedSeverity !== 'all' && f.severity !== selectedSeverity) return false;
      if (selectedScanner !== 'all' && f.scanner !== selectedScanner) return false;
      if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;

      return true;
    });
  }, [findings, searchQuery, selectedSeverity, selectedScanner, selectedCategory]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('all');
    setSelectedScanner('all');
    setSelectedCategory('all');
  };

  const hasActiveFilters =
    searchQuery !== '' || selectedSeverity !== 'all' || selectedScanner !== 'all' || selectedCategory !== 'all';

  const severityCounts = useMemo(() => {
    return {
      all: findings.length,
      critical: findings.filter((f) => f.severity === 'critical').length,
      high: findings.filter((f) => f.severity === 'high').length,
      medium: findings.filter((f) => f.severity === 'medium').length,
      low: findings.filter((f) => f.severity === 'low').length,
    };
  }, [findings]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Findings Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, and inspect verified vulnerabilities detected across all scanner subprocesses
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Displaying:</span>
          <span className="px-2 py-0.5 rounded-full bg-vanta-850 border border-white/[0.08] text-white font-bold">
            {filteredFindings.length} / {findings.length}
          </span>
        </div>
      </div>

      {/* Quick Severity Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'All Issues', count: severityCounts.all },
          { id: 'critical', label: 'Critical', count: severityCounts.critical, color: 'text-rose-400' },
          { id: 'high', label: 'High', count: severityCounts.high, color: 'text-orange-400' },
          { id: 'medium', label: 'Medium', count: severityCounts.medium, color: 'text-amber-400' },
          { id: 'low', label: 'Low', count: severityCounts.low, color: 'text-blue-400' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSeverity(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedSeverity === tab.id
                ? 'bg-brand-orange text-white shadow-glow-sm'
                : 'bg-vanta-900 text-slate-400 hover:text-slate-200 border border-white/[0.06] hover:bg-vanta-850'
            }`}
          >
            <span className={selectedSeverity === tab.id ? 'text-white' : tab.color}>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedSeverity === tab.id ? 'bg-white/20 text-white' : 'bg-vanta-950 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Secondary Filter Controls */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-vanta-900/70 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, rule ID, relative file path, or snippet..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-vanta-950 border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Scanner Filter */}
          <select
            value={selectedScanner}
            onChange={(e) => setSelectedScanner(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-vanta-950 border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="all">All Scanner Engines</option>
            {scanners.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-vanta-950 border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-brand-orange hover:text-amber-300 font-bold px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-white/[0.08] bg-vanta-900/40 space-y-3">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Matching Security Findings</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {hasActiveFilters ? 'Adjust search parameters or clear filters.' : 'Zero findings detected in active review.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-vanta-850 hover:bg-vanta-800 text-xs font-semibold text-white border border-white/[0.08] cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((f) => (
            <div
              key={f.id}
              onClick={() => onSelectFinding(f)}
              className="p-5 rounded-2xl border border-white/[0.08] bg-vanta-900/70 hover:bg-vanta-850/80 hover:border-brand-orange/40 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-[280px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} size="sm" />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-vanta-950 text-slate-300 border border-white/[0.06]">
                      {f.scanner} :: {f.ruleId}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                      {f.category}
                    </span>
                    <StatusBadge status={f.status} />
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-brand-orange transition-colors">
                    {f.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    Confidence: <span className="text-slate-300 font-bold capitalize">{f.confidence}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <FileCode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate text-slate-300 font-medium">
                  {f.filePath}
                  {f.startLine ? `:${f.startLine}` : ''}
                </span>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {f.plainLanguageImpact}
              </p>

              {f.snippet && (
                <div className="p-3 rounded-xl bg-vanta-950/80 border border-white/[0.06] font-mono text-[11px] text-slate-300 truncate">
                  {f.snippet.split('\n')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
