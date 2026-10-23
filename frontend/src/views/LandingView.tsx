import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { SecurityArtifactVisual } from '../components/SecurityArtifactVisual';
import { ScanStory } from '../components/ScanStory';
import {
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Terminal,
  RefreshCw,
  GitBranch,
  UploadCloud,
  ChevronRight,
  ChevronDown,
  Layers,
  Lock,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface LandingViewProps {
  onOpenScanner: () => void;
  onRunDemoScan?: () => void;
}

export function LandingView({ onOpenScanner, onRunDemoScan }: LandingViewProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Smooth scroll progress indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopySamplePrompt = () => {
    const sampleText = `--- VANTASCAN DIRECTIVE ---
Target: api/checkout.ts:42
Fix: Remove hardcoded Stripe secret key. Replace with process.env.STRIPE_SECRET_KEY.
Revocation: Rotate exposed key immediately at https://dashboard.stripe.com/apikeys.
Constraint: Do not alter existing payment flow error handling.`;
    navigator.clipboard.writeText(sampleText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -75;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Section smooth entrance variants
  const sectionVariants = {
    hidden: { opacity: 0, y: 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const headerStagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  const itemFadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const cardsContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text font-sans selection:bg-black selection:text-white relative">
      {/* Micro-hairline Smooth Scroll Progress Bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-neutral-800 via-black to-neutral-700 origin-left z-[60] pointer-events-none"
      />


      {/* Top Navigation Bar — Floating, Clean & Completely Borderless */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${scrolled
            ? 'bg-editorial-bg/85 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.03)] py-1'
            : 'bg-transparent py-2'
          }`}
      >
        <div className="max-w-7xl mx-auto h-16 px-6 sm:px-8 flex items-center justify-between">
          {/* Brand Identity — ElevenLabs Signature Aesthetic */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-black rounded-full" />
              <span className="w-1.5 h-4 bg-black rounded-full" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold tracking-tight text-[17px] text-black">VantaScan</span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Security</span>
            </div>
          </div>

          {/* Editorial Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-editorial-body font-normal">
            <button
              onClick={() => scrollToSection('problem')}
              className="hover:text-black transition-colors relative py-1"
            >
              The Problem
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-black transition-colors relative py-1"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('report-preview')}
              className="hover:text-black transition-colors relative py-1"
            >
              Report Engine
            </button>
            <button
              onClick={() => scrollToSection('verification-loop')}
              className="hover:text-black transition-colors relative py-1"
            >
              Verification Loop
            </button>
          </nav>

          {/* Action CTAs — ElevenLabs Pill Button System */}
          <div className="flex items-center gap-2.5">
            {onRunDemoScan && (
              <button
                onClick={onRunDemoScan}
                className="hidden sm:inline-flex items-center justify-center text-sm font-medium text-black bg-white rounded-full border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 px-5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all"
              >
                Sample Scan
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenScanner}
              className="inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-neutral-800 text-sm font-medium px-5 py-2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all"
            >
              <span>Scan your project</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* 4.1 Hero Section */}
      <section className="relative pt-12 pb-24 md:pt-18 md:pb-32 overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-neutral-200/20 via-transparent to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left: Typography & Headline */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col items-start max-w-2xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-editorial-warm border border-editorial-divider/80 text-xs font-mono text-editorial-body shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-editorial-violet animate-pulse" />
                <span>Multi-Scanner AI Security Reviewer</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-editorial-text leading-[1.08] mb-6">
                Your code ships fast.
                <br />
                <span className="text-editorial-body">Your security should too.</span>
              </h1>

              <p className="text-lg sm:text-xl text-editorial-body leading-relaxed mb-10 max-w-xl">
                Scan vibe-coded websites for exposed secrets, vulnerable code and risky dependencies.
                Get evidence-backed findings and fixes you can apply immediately.
              </p>

              {/* CTAs — ElevenLabs Pill Button System */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenScanner}
                  className="inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-neutral-800 text-[15px] font-medium px-7 py-3 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all"
                >
                  <span>Scan your project</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => scrollToSection('how-it-works')}
                  className="inline-flex items-center justify-center gap-1.5 bg-white text-black hover:text-black border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-[15px] font-medium px-6 py-3 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all"
                >
                  <span>See how it works</span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </motion.button>
              </div>

              {/* Engine Badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="mt-12 pt-6 border-t border-editorial-divider/60 flex flex-wrap items-center gap-6 text-xs text-editorial-muted font-mono"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  Gitleaks
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  Semgrep AST
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  Trivy CVEs
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  Google Gemini AI
                </span>
              </motion.div>
            </motion.div>

            {/* Right: Signature 3D Visual Artifact */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="lg:col-span-5 flex justify-center items-center"
            >
              <SecurityArtifactVisual />
            </motion.div>
          </div>

          {/* Smooth Scroll Prompt Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex justify-center mt-16 cursor-pointer"
            onClick={() => scrollToSection('problem')}
          >
            <div className="flex flex-col items-center gap-1 text-editorial-muted hover:text-black transition-colors group">
              <span className="text-[11px] font-mono tracking-wider uppercase">Scroll to explore</span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4 text-editorial-muted group-hover:text-black transition-colors" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Scene 01 — The Problem */}
      <motion.section
        id="problem"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
        className="py-24 md:py-32 bg-editorial-warm relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div variants={headerStagger} className="max-w-3xl mb-16">
            <motion.span variants={itemFadeUp} className="text-xs uppercase font-mono tracking-wider text-editorial-muted mb-3 block">
              Scene 01 · The Vulnerability Debt
            </motion.span>
            <motion.h2 variants={itemFadeUp} className="text-3xl sm:text-4xl font-normal tracking-tight text-editorial-text leading-tight mb-4">
              Built in minutes.
              <br />
              Vulnerabilities can last much longer.
            </motion.h2>
            <motion.p variants={itemFadeUp} className="text-base sm:text-lg text-editorial-body leading-relaxed">
              Coding agents generate functional prototypes at astonishing velocity. But under the hood,
              they frequently leave live API credentials, permissive CORS headers, unparameterized database
              queries, and outdated dependencies waiting to be exploited.
            </motion.p>
          </motion.div>

          <motion.div
            variants={cardsContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                num: '01',
                title: 'Hardcoded Environment Secrets',
                desc: 'Tokens, private RSA keys, and third-party API credentials committed directly into frontend bundles or repository code.',
              },
              {
                num: '02',
                title: 'Permissive Access & Injection',
                desc: 'Raw string interpolation in database drivers and unvalidated client redirects that allow XSS, SSRF, and data tampering.',
              },
              {
                num: '03',
                title: 'Unchecked Supply Chains',
                desc: 'Phantom packages, unpinned dependencies with known CVE advisories, and malicious lockfile dependencies.',
              },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                variants={itemFadeUp}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="bg-white p-8 rounded-2xl border border-editorial-divider/80 transition-all hover:border-editorial-muted hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.08)] group"
              >
                <div className="w-8 h-8 rounded-full bg-editorial-warm border border-editorial-divider flex items-center justify-center mb-5 font-mono text-xs text-black group-hover:scale-105 transition-transform">
                  {card.num}
                </div>
                <h3 className="text-base font-medium text-black mb-2">{card.title}</h3>
                <p className="text-sm text-editorial-body leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Scene 02 — The Scan (Interactive Scroll-Linked Visual Sequence) */}
      <ScanStory id="the-scan" />

      {/* Scene 03 — How It Works (Connected Timeline) */}
      <motion.section
        id="how-it-works"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
        className="py-24 md:py-32 bg-editorial-warm relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div variants={headerStagger} className="max-w-2xl mb-16">
            <motion.span variants={itemFadeUp} className="text-xs uppercase font-mono tracking-wider text-editorial-muted mb-3 block">
              Scene 03 · Architecture
            </motion.span>
            <motion.h2 variants={itemFadeUp} className="text-3xl sm:text-4xl font-normal tracking-tight text-editorial-text leading-tight mb-4">
              Three deliberate steps.
              <br />
              Zero guesswork.
            </motion.h2>
          </motion.div>

          <motion.div variants={cardsContainer} className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: 'STEP 01',
                title: 'Submit your project',
                desc: 'Upload a source ZIP archive or submit a public GitHub repository. Archive sizes, path traversal (ZipSlip), and decompressed byte limits are rigorously defended.',
                icon: UploadCloud,
                badge: 'ZIP Upload or GitHub Intake',
              },
              {
                step: 'STEP 02',
                title: 'Inspect the code',
                desc: 'Our orchestration engine runs Gitleaks, Semgrep rules, Trivy dependency checks, and the AST heuristic engine in parallel. Partial failures and limitations are disclosed honestly.',
                icon: Terminal,
                badge: 'Deterministic Scanner Pipeline',
              },
              {
                step: 'STEP 03',
                title: 'Fix and verify',
                desc: 'Generate an agent repair prompt with precise instructions and constraints. Apply the fixes in your IDE or coding agent, then rescan to prove vulnerabilities are genuinely resolved.',
                icon: RefreshCw,
                badge: 'Stateful Diff Verification',
              },
            ].map((st, idx) => (
              <motion.div
                key={idx}
                variants={itemFadeUp}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                className="bg-white p-8 rounded-2xl border border-editorial-divider/80 relative transition-all hover:border-editorial-muted hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.08)] group"
              >
                <span className="text-xs font-mono font-bold text-editorial-muted block mb-4">
                  {st.step}
                </span>
                <h3 className="text-lg font-medium text-black mb-3">{st.title}</h3>
                <p className="text-sm text-editorial-body leading-relaxed mb-6">{st.desc}</p>
                <div className="flex items-center gap-2 font-mono text-xs text-editorial-muted pt-4 border-t border-editorial-divider">
                  <st.icon className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                  <span>{st.badge}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Scene 04 — Report Reveal Preview */}
      <motion.section
        id="report-preview"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
        className="py-24 md:py-32 bg-editorial-bg relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div variants={headerStagger} className="max-w-2xl mb-12">
            <motion.span variants={itemFadeUp} className="text-xs uppercase font-mono tracking-wider text-editorial-muted mb-3 block">
              Scene 04 · Report & Remediation
            </motion.span>
            <motion.h2 variants={itemFadeUp} className="text-3xl sm:text-4xl font-normal tracking-tight text-editorial-text leading-tight mb-4">
              Actionable findings.
              <br />
              Ready for your coding agent.
            </motion.h2>
            <motion.p variants={itemFadeUp} className="text-base text-editorial-body leading-relaxed">
              No generic security summaries. VantaScan produces concrete evidence, plain-language business impact,
              and a copyable 10-section prompt structured specifically for Claude Code, Cursor, or Aider.
            </motion.p>
          </motion.div>

          {/* Sample Report Card */}
          <motion.div
            variants={itemFadeUp}
            whileHover={{ y: -4, transition: { duration: 0.25 } }}
            className="bg-white rounded-2xl border border-editorial-divider/90 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-editorial-divider gap-4">
              <div>
                <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-editorial-muted mb-1">
                  SAMPLE AUDIT REPORT PREVIEW
                </span>
                <h3 className="text-xl font-medium text-black">VibeStack E-Commerce Backend</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-mono font-medium">
                  1 Critical
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-mono font-medium">
                  2 High
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-mono font-medium">
                  1 Medium
                </span>
              </div>
            </div>

            {/* Repair Prompt Box Preview */}
            <div className="mt-6 p-5 bg-editorial-warm rounded-xl border border-editorial-divider">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-black font-semibold flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-black" />
                  Generated AI Agent Repair Prompt
                </span>
                <button
                  onClick={handleCopySamplePrompt}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 rounded-full text-xs font-mono text-black transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98]"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Sample Prompt</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs font-mono text-editorial-body leading-relaxed whitespace-pre-wrap select-all">
                {`# VANTASCAN TARGETED REPAIR DIRECTIVE
Target File: api/checkout.ts:42
Vulnerability: GITLEAKS: Hardcoded Live Payment API Key (Critical)
Evidence: sk_live_••••••••••••••••••••••••39a1

[INSTRUCTIONS]
1. Delete hardcoded credential from api/checkout.ts line 42.
2. Read credential strictly from process.env.STRIPE_SECRET_KEY.
3. Add null check throwing runtime error if environment variable is missing.
4. IMPORTANT: Exposed key must be revoked at dashboard.stripe.com/apikeys.
5. Do not modify surrounding payment handler logic or introduce new dependencies.`}
              </pre>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Scene 05 — The Verification Loop */}
      <motion.section
        id="verification-loop"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={sectionVariants}
        className="py-24 md:py-32 bg-editorial-warm relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <motion.div variants={headerStagger} className="max-w-2xl mb-14">
            <motion.span variants={itemFadeUp} className="text-xs uppercase font-mono tracking-wider text-editorial-muted mb-3 block">
              Scene 05 · Rescan & Diff
            </motion.span>
            <motion.h2 variants={itemFadeUp} className="text-3xl sm:text-4xl font-normal tracking-tight text-editorial-text leading-tight mb-4">
              Finding bugs is easy.
              <br />
              Verifying fixes is proof.
            </motion.h2>
            <motion.p variants={itemFadeUp} className="text-base text-editorial-body leading-relaxed">
              When you submit corrected code, VantaScan matches findings against the baseline scan using stable structural fingerprints.
              Each finding is categorized with mathematically verified status:
            </motion.p>
          </motion.div>

          <motion.div variants={cardsContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                status: 'RESOLVED',
                badge: 'bg-emerald-100 text-emerald-800',
                title: 'Stripe Secret Key',
                desc: 'Verified eliminated in rescan. Zero secrets detected in payments module.',
              },
              {
                status: 'STILL PRESENT',
                badge: 'bg-neutral-200 text-neutral-800',
                title: 'Wildcard CORS Header',
                desc: 'Access-Control-Allow-Origin: * remains in server.ts:24. Still active.',
              },
              {
                status: 'NEW FINDING',
                badge: 'bg-amber-100 text-amber-800',
                title: 'Unpinned Package',
                desc: 'Newly introduced dependency jsonwebtoken: ^8.5.1 has known CVE advisory.',
              },
              {
                status: 'INCONCLUSIVE',
                badge: 'bg-blue-100 text-blue-800',
                title: 'Coverage Difference',
                desc: 'Semgrep AST engine syntax error occurred on patched file. Cannot confirm fix.',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemFadeUp}
                whileHover={{ y: -5, transition: { duration: 0.25 } }}
                className="bg-white p-6 rounded-2xl border border-editorial-divider/80 transition-all hover:border-editorial-muted hover:shadow-[0_10px_24px_-10px_rgba(0,0,0,0.06)] group"
              >
                <span className={`inline-block px-2.5 py-0.5 mb-3 rounded-full ${item.badge} text-[11px] font-mono font-medium`}>
                  {item.status}
                </span>
                <h3 className="text-sm font-medium text-black mb-1">{item.title}</h3>
                <p className="text-xs text-editorial-body">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Scene 06 — Final Conversion */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionVariants}
        className="py-28 md:py-36 bg-editorial-bg text-center relative overflow-hidden"
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8 flex flex-col items-center relative z-10">
          <motion.h2
            variants={itemFadeUp}
            className="text-4xl sm:text-5xl font-normal tracking-tight text-editorial-text mb-6"
          >
            Ship the idea.
            <br />
            Verify the code.
          </motion.h2>
          <motion.p
            variants={itemFadeUp}
            className="text-lg text-editorial-body mb-10 max-w-lg"
          >
            Find security issues before they become someone else&apos;s problem.
          </motion.p>

          <motion.div
            variants={itemFadeUp}
            className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto"
          >
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenScanner}
              className="inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-neutral-800 text-[15px] font-medium px-8 py-3.5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-all w-full sm:w-auto"
            >
              <span>Scan your project</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {onRunDemoScan && (
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRunDemoScan}
                className="inline-flex items-center justify-center gap-2 bg-white text-black hover:text-black border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 text-[15px] font-medium px-7 py-3.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-all w-full sm:w-auto"
              >
                <span>Run sample demo</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* Minimal Editorial Footer */}
      <footer className="border-t border-editorial-divider/60 bg-editorial-warm py-12 text-xs text-editorial-muted">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-black">VantaScan</span>
            <span>·</span>
            <span>AI-Assisted Security Reviewer</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onOpenScanner} className="hover:text-black transition-colors">
              Intake
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-black transition-colors">
              Documentation
            </button>
            <button onClick={() => scrollToSection('problem')} className="hover:text-black transition-colors">
              Security Model
            </button>
            <span className="text-editorial-divider">|</span>
            <span>Local Filesystem SQLite Persistence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
