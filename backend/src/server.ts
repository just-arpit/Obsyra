import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { scansRouter } from './routes/scans.js';
import { remediationRouter } from './routes/remediation.js';
import { compareRouter } from './routes/compare.js';
import { fixturesRouter } from './routes/fixtures.js';
import { getScannerReadiness } from './scanners/detector.js';
import { redactText } from './sanitization/redactor.js';

import path from 'path';
import fs from 'fs';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security Headers Middleware (defense-in-depth: CSP, HSTS, X-Content-Type-Options, Clickjacking protection)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https:;"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Mount API routes
app.use('/api', healthRouter);
app.use('/api/scans', scansRouter);
app.use('/api/scans', remediationRouter);
app.use('/api/comparisons', compareRouter);
app.use('/api/fixtures', fixturesRouter);

// In production, serve static assets from frontend/dist if available
const candidateStaticDirs = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'dist/frontend'),
];

const resolvedStaticDir = candidateStaticDirs.find((dir) => fs.existsSync(dir));
if (resolvedStaticDir) {
  app.use(express.static(resolvedStaticDir));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(resolvedStaticDir, 'index.html'));
  });
}

// Global safe error handler - prevents leaking secrets or raw stack traces
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const safeMessage = redactText(err?.message || 'An unexpected server error occurred');
  console.error('[Obsyra Error]', safeMessage);
  res.status(err.status || 500).json({
    error: 'Server Error',
    message: safeMessage,
  });
});

export function startServer() {
  return app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`🛡️  Obsyra Backend Server listening on port ${PORT}`);
    console.log(`🌐  Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);

    try {
      const readiness = await getScannerReadiness();
      console.log('Scanner Readiness:');
      console.log(` - Gitleaks:      ${readiness.gitleaks.installed ? `READY (${readiness.gitleaks.version})` : 'NOT FOUND'}`);
      console.log(` - Semgrep:       ${readiness.semgrep.installed ? `READY (${readiness.semgrep.version})` : 'NOT FOUND'}`);
      console.log(` - Trivy:         ${readiness.trivy.installed ? `READY (${readiness.trivy.version})` : 'NOT FOUND'}`);
      console.log(` - URL Inspector: READY (${readiness.urlInspector.version})`);
    } catch (e: any) {
      console.warn('Could not inspect scanners at startup:', e?.message);
    }
  });
}

// Start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
