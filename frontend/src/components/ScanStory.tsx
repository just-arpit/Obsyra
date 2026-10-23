import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

/**
 * Scene B: scroll-linked illustration of a scan. On large screens the stage is
 * sticky while the section scrolls (about one extra screen, never trapping the
 * reader); on small screens or with reduced motion, the final state is shown.
 * Everything here is illustrative and labelled as such.
 */
const FILES = ["server.js", "routes/notes.js", "public/app.js", ".env"];
const CODE: { n: number; text: string; flag?: { label: string; rule: string } }[] = [
  { n: 12, text: 'const express = require("express");' },
  { n: 13, text: 'const stripe = Stripe("sk_live_••••••••••");', flag: { label: "Exposed Stripe key", rule: "gitleaks · stripe-access-token" } },
  { n: 14, text: "" },
  { n: 15, text: 'app.get("/api/notes/search", (req, res) => {' },
  { n: 16, text: "  const q = req.query.q;" },
  { n: 17, text: "  db.all(`SELECT * FROM notes WHERE title LIKE '%${q}%'`);", flag: { label: "SQL injection", rule: "semgrep · vs.node.sql-injection" } },
  { n: 18, text: "});" },
  { n: 19, text: "" },
  { n: 20, text: 'app.delete("/api/notes/:id", (req, res) => {', flag: { label: "No authorization check", rule: "semgrep · needs review" } },
  { n: 21, text: '  db.run("DELETE FROM notes WHERE id = ?", [req.params.id]);' },
  { n: 22, text: "});" },
];
const STEPS = [
  "Your project's source files are unpacked, never executed.",
  "A scanning plane passes over every line.",
  "Lines that match a rule are highlighted.",
  "Each finding is pinned to its file and line.",
  "Everything resolves into one evidence-backed report.",
];

function useIsDesktop() {
  const [d, setD] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setD(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return d;
}

function Line({ c, i, p, still }: { c: (typeof CODE)[number]; i: number; p: MotionValue<number>; still: boolean }) {
  // Plane crosses line i at progress 0.22 + i * 0.035.
  const hit = 0.22 + i * 0.035;
  const bg = useTransform(
    p,
    [hit - 0.01, hit, hit + 0.05],
    c.flag
      ? ["rgba(4,71,255,0)", "rgba(4,71,255,0.14)", "rgba(255,71,4,0.09)"]
      : ["rgba(4,71,255,0)", "rgba(4,71,255,0.07)", "rgba(4,71,255,0)"]
  );
  const chipOpacity = useTransform(p, [hit + 0.02, hit + 0.08], [0, 1]);
  const chipX = useTransform(p, [hit + 0.02, hit + 0.08], [8, 0]);
  const flaggedBg = c.flag ? "rgba(255,71,4,0.09)" : "transparent";
  return (
    <motion.div className="relative flex items-center gap-3 pr-3" style={{ background: still ? flaggedBg : bg }}>
      <span className="w-7 shrink-0 select-none text-right text-[#a8a29e]">{c.n}</span>
      <span className="min-w-0 flex-1 truncate whitespace-pre text-[#292524]">{c.text || " "}</span>
      {c.flag && (
        <motion.span
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#ffd6c6] bg-white px-2 py-0.5 font-sans text-[11px] text-[#9a2c00] sm:inline-flex"
          style={still ? undefined : { opacity: chipOpacity, x: chipX }}
        >
          <span className="size-1.5 rounded-full bg-[#ff4704]" aria-hidden />
          {c.flag.label}
        </motion.span>
      )}
    </motion.div>
  );
}

function Stage({ p, still }: { p: MotionValue<number>; still: boolean }) {
  const filesOpacity = useTransform(p, [0, 0.12], [0, 1]);
  const filesY = useTransform(p, [0, 0.12], [16, 0]);
  const planeTop = useTransform(p, [0.2, 0.62], ["0%", "100%"]);
  const planeOpacity = useTransform(p, [0.17, 0.22, 0.6, 0.66], [0, 1, 1, 0]);
  const codeOpacity = useTransform(p, [0.76, 0.86], [1, 0.25]);
  const codeScale = useTransform(p, [0.76, 0.86], [1, 0.97]);
  const reportOpacity = useTransform(p, [0.78, 0.9], [0, 1]);
  const reportY = useTransform(p, [0.78, 0.9], [24, 0]);
  return (
    <div className="relative">
      <motion.div style={still ? undefined : { opacity: filesOpacity, y: filesY }} className="mb-3 flex flex-wrap gap-1.5 font-mono text-[11.5px]">
        {FILES.map((f, i) => (
          <span
            key={f}
            className={
              i === 0
                ? "rounded-md border border-[#d6d3cf] bg-white px-2.5 py-1 text-black font-medium"
                : "rounded-md border border-[#ebe8e4] px-2.5 py-1 text-[#777169]"
            }
          >
            {f}
          </span>
        ))}
      </motion.div>
      <motion.div
        style={still ? undefined : { opacity: codeOpacity, scale: codeScale }}
        className="relative overflow-hidden rounded-xl border border-[#ebe8e4] bg-white py-3 font-mono text-[12.5px] leading-[2] shadow-[0_1px_0_rgba(0,0,0,0.03),0_30px_60px_-30px_rgba(0,0,0,0.18)]"
      >
        {!still && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 h-px"
            style={{
              top: planeTop,
              opacity: planeOpacity,
              background: "linear-gradient(90deg, transparent, #0447ff 18%, #0447ff 82%, transparent)",
              boxShadow: "0 0 18px 2px rgba(4,71,255,0.35)",
            }}
          />
        )}
        {CODE.map((c, i) => (
          <Line key={c.n} c={c} i={i} p={p} still={still} />
        ))}
      </motion.div>
      <motion.div style={still ? undefined : { opacity: reportOpacity, y: reportY }} className={still ? "mt-4" : "absolute inset-x-6 bottom-6"}>
        <div className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white font-sans shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between border-b border-[#ebebeb] px-4 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#666]">Report · 3 findings</span>
            <span className="font-mono text-[11px] text-[#8f8f8f]">illustrative</span>
          </div>
          {CODE.filter((c) => c.flag).map((c, i) => (
            <div key={c.n} className="flex items-center gap-3 border-b border-[#ebebeb] px-4 py-2.5 last:border-0">
              <span
                className={
                  i < 2
                    ? "rounded-[4px] border border-[#f3c3c3] bg-[#fdf5f5] px-1.5 font-mono text-[10px] uppercase text-[#c52828]"
                    : "rounded-[4px] border border-[#f0d0bd] bg-[#fdf6f1] px-1.5 font-mono text-[10px] uppercase text-[#b84a06]"
                }
              >
                {i < 2 ? "Critical" : "High"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#171717] font-medium">{c.flag!.label}</span>
              <span className="hidden font-mono text-[11.5px] text-[#8f8f8f] sm:inline">server.js:{c.n}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function ScanStory({ id = "the-scan" }: { id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const animated = desktop && !reduce;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [step, setStep] = useState(animated ? 0 : STEPS.length - 1);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!animated) return;
    setStep(v < 0.18 ? 0 : v < 0.4 ? 1 : v < 0.58 ? 2 : v < 0.76 ? 3 : 4);
  });

  const captions = (
    <ol className="space-y-4">
      {STEPS.map((s, i) => (
        <li key={s} className="flex gap-4 transition-colors duration-300" aria-current={i === step ? "step" : undefined}>
          <span className={`w-6 shrink-0 font-mono text-[12px] leading-7 ${i === step || !animated ? "text-black font-semibold" : "text-[#c4c0bb]"}`}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className={`text-[17px] leading-7 transition-colors duration-300 ${i === step || !animated ? "text-black font-normal" : "text-[#b5b0aa]"}`}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <section id={id} aria-labelledby="scan-h" className="scroll-mt-16 border-y border-[#ebe8e4] bg-[#f5f3f1]">
      <div ref={ref} className={animated ? "relative h-[210vh]" : "relative"}>
        <div className={animated ? "sticky top-16 flex h-[calc(100vh-4rem)] items-center" : "py-24"}>
          <div className="mx-auto grid w-full max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#777169]">How a scan works</p>
              <h2 id="scan-h" className="mt-4 text-[38px] font-light leading-[1.05] tracking-[-0.035em] [text-wrap:balance] sm:text-[48px] text-neutral-900">
                Every line, inspected by tools built for the job.
              </h2>
              <div className="mt-10">{captions}</div>
              <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.08em] text-[#a8a29e]">
                Illustrative example · not your results
              </p>
            </div>
            <Stage p={scrollYProgress} still={!animated} />
          </div>
        </div>
      </div>
    </section>
  );
}
