import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanRecord, ScannerReadiness, Finding } from './types';
import { fetchScans, fetchScanners, fetchScan, runDemoScan } from './api/client';
import { AppHeader } from './components/AppHeader';
import { Toast, ToastMessage } from './components/Toast';
import { FindingDetailModal } from './components/FindingDetailModal';
import { LandingView } from './views/LandingView';
import { IntakeView } from './views/IntakeView';
import { LiveScanView } from './views/LiveScanView';
import { ReportView } from './views/ReportView';
import { ComparisonView } from './views/ComparisonView';
import { HistoryView } from './views/HistoryView';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [activeScan, setActiveScan] = useState<ScanRecord | null>(null);
  const [readiness, setReadiness] = useState<ScannerReadiness | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation function preserving browser history
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = `tst-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load initial scans and scanner readiness
  const loadScans = async () => {
    try {
      const list = await fetchScans();
      setScans(list);
      return list;
    } catch (err: any) {
      console.warn('Could not load initial scan history:', err.message);
      return [];
    }
  };

  const loadReadiness = async () => {
    try {
      const r = await fetchScanners();
      setReadiness(r);
    } catch (err: any) {
      console.warn('Could not load scanner status:', err.message);
    }
  };

  useEffect(() => {
    loadReadiness();
    loadScans();
  }, []);

  // Ensure activeScan is populated when URL is /scans/:scanId or /scanner/:scanId
  useEffect(() => {
    const matchScan = currentPath.match(/^\/(?:scans|scanner)\/([a-zA-Z0-9_-]+)(?:\/compare)?$/);
    if (matchScan) {
      const targetId = matchScan[1];
      if (targetId === 'new') return; // Not a scan ID

      // If activeScan does not match targetId, fetch or find it
      if (!activeScan || activeScan.id !== targetId) {
        const found = scans.find((s) => s.id === targetId);
        if (found) {
          setActiveScan(found);
        } else {
          fetchScan(targetId)
            .then((loaded) => {
              setActiveScan(loaded);
              setScans((prev) => {
                if (!prev.some((s) => s.id === loaded.id)) {
                  return [loaded, ...prev];
                }
                return prev;
              });
            })
            .catch(() => {
              // Non-fatal if scan is not yet created
            });
        }
      }
    }
  }, [currentPath, scans, activeScan]);

  const handleScanCreated = (scan: ScanRecord) => {
    setScans((prev) => [scan, ...prev.filter((s) => s.id !== scan.id)]);
    setActiveScan(scan);
  };

  const handleRunDemoScan = async () => {
    try {
      showToast('info', 'Executing vulnerable baseline project scan...');
      const res = await runDemoScan('vulnerable');
      handleScanCreated(res.scan);
      showToast('success', `Demo scan completed: ${res.scan.summary.total} findings identified.`);
      navigate(`/scans/${res.scan.id}`);
    } catch (err: any) {
      showToast('error', err.message || 'Demo scan execution failed');
      navigate('/scanner/new');
    }
  };

  // Route matching
  const routeContent = useMemo(() => {
    if (currentPath === '/') {
      return (
        <LandingView
          onOpenScanner={() => navigate('/scanner/new')}
          onRunDemoScan={handleRunDemoScan}
        />
      );
    }

    // Application Routes
    return (
      <div className="min-h-screen bg-app-canvas text-app-primary flex flex-col font-sans">
        {/* Monochromatic Application Header */}
        <AppHeader
          currentPath={currentPath}
          onNavigate={navigate}
          activeScan={activeScan}
          scans={scans}
          onSelectScan={(s) => setActiveScan(s)}
          readiness={readiness}
        />

        {/* Main Routed Content Area */}
        <motion.main
          key={currentPath}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 pb-16"
        >
          {/* /scanner/new or /scanner */}
          {(currentPath === '/scanner/new' || currentPath === '/scanner') && (
            <IntakeView
              readiness={readiness}
              scans={scans}
              onScanCreated={handleScanCreated}
              onNavigateToLive={(scanId) => navigate(`/scanner/${scanId}`)}
              showToast={showToast}
            />
          )}

          {/* /scanner/:scanId (Live Telemetry) */}
          {currentPath.startsWith('/scanner/') && currentPath !== '/scanner/new' && (
            <LiveScanView
              scanId={currentPath.replace('/scanner/', '')}
              onOpenReport={(id) => navigate(`/scans/${id}`)}
              onNavigateToIntake={() => navigate('/scanner/new')}
              onScanCompleted={handleScanCreated}
            />
          )}

          {/* /scans/:scanId/compare */}
          {currentPath.includes('/compare') && (
            <ComparisonView
              scan={activeScan}
              scans={scans}
              onScanCompleted={handleScanCreated}
              onNavigateToReport={(id) => navigate(`/scans/${id}`)}
              showToast={showToast}
            />
          )}

          {/* /scans/:scanId (Security Report) */}
          {currentPath.startsWith('/scans/') && !currentPath.includes('/compare') && (
            <ReportView
              scan={activeScan}
              onSelectFinding={setSelectedFinding}
              onInitiateRescan={(id) => navigate('/scanner/new')}
              onNavigateToCompare={(id) => navigate(`/scans/${id}/compare`)}
              showToast={showToast}
            />
          )}

          {/* /history */}
          {currentPath === '/history' && (
            <HistoryView
              onOpenReport={(id) => {
                const s = scans.find((item) => item.id === id);
                if (s) setActiveScan(s);
                navigate(`/scans/${id}`);
              }}
              onInitiateRescan={(id) => {
                const s = scans.find((item) => item.id === id);
                if (s) setActiveScan(s);
                navigate('/scanner/new');
              }}
              onNavigateToCompare={(id) => navigate(`/scans/${id}/compare`)}
              onNavigateToIntake={() => navigate('/scanner/new')}
              showToast={showToast}
            />
          )}
        </motion.main>

        {/* Monochromatic Application Footer */}
        <footer className="border-t border-app-border bg-white py-5 text-center text-xs text-app-muted">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-app-secondary">Obsyra DevSec Engine</span>
              <span>·</span>
              <span>Deterministic Multi-Scanner Verification & AI Remediation</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-app-secondary hover:text-app-primary hover:underline"
              >
                Return to Product Overview
              </button>
              <span>·</span>
              <span className="font-mono text-[11px]">v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }, [currentPath, activeScan, scans, readiness]);

  return (
    <>
      {routeContent}

      {/* Finding Detail Inspection Modal */}
      <AnimatePresence>
        {selectedFinding && (
          <FindingDetailModal
            finding={selectedFinding}
            onClose={() => setSelectedFinding(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating System Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
