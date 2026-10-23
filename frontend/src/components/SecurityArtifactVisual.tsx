import React, { useEffect, useRef, useState } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  highlightIntensity: number;
}

export function SecurityArtifactVisual() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Handle high DPI displays
    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Generate 3D Geodesic Code Artifact Nodes
    const points: Point3D[] = [];
    const radius = 140;
    const rings = 9;
    const pointsPerRing = 14;

    for (let r = 0; r < rings; r++) {
      const phi = (Math.PI * (r + 1)) / (rings + 1);
      const ringRadius = radius * Math.sin(phi);
      const y = radius * Math.cos(phi);

      for (let p = 0; p < pointsPerRing; p++) {
        const theta = (2 * Math.PI * p) / pointsPerRing + (r % 2 === 0 ? 0.2 : 0);
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);

        points.push({
          x,
          y,
          z,
          baseX: x,
          baseY: y,
          baseZ: z,
          highlightIntensity: 0,
        });
      }
    }

    // Add core dependency hub nodes
    const hubPoints: Point3D[] = [
      { x: 0, y: -radius * 0.95, z: 0, baseX: 0, baseY: -radius * 0.95, baseZ: 0, highlightIntensity: 0 },
      { x: 0, y: radius * 0.95, z: 0, baseX: 0, baseY: radius * 0.95, baseZ: 0, highlightIntensity: 0 },
      { x: 0, y: 0, z: 0, baseX: 0, baseY: 0, baseZ: 0, highlightIntensity: 0 },
    ];
    points.push(...hubPoints);

    let angleX = 0.25;
    let angleY = 0;
    let scanPlaneY = -radius * 1.2;
    let scanDirection = 1;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth pointer parallax
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      angleY += 0.007;
      const effectiveAngleX = angleX + mouseRef.current.y * 0.3;
      const effectiveAngleY = angleY + mouseRef.current.x * 0.4;

      // Scan plane oscillating up and down across the object
      scanPlaneY += scanDirection * 1.25;
      if (scanPlaneY > radius * 1.2) {
        scanDirection = -1;
      } else if (scanPlaneY < -radius * 1.2) {
        scanDirection = 1;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const fov = 380;

      // Rotate and project points
      const projected = points.map((pt) => {
        // Rotation around Y
        const cosY = Math.cos(effectiveAngleY);
        const sinY = Math.sin(effectiveAngleY);
        const x1 = pt.baseX * cosY - pt.baseZ * sinY;
        const z1 = pt.baseX * sinY + pt.baseZ * cosY;

        // Rotation around X
        const cosX = Math.cos(effectiveAngleX);
        const sinX = Math.sin(effectiveAngleX);
        const y2 = pt.baseY * cosX - z1 * sinX;
        const z2 = pt.baseY * sinX + z1 * cosX;

        // Scanning plane intersection detection
        const distToScan = Math.abs(y2 - scanPlaneY);
        if (distToScan < 24) {
          pt.highlightIntensity = Math.max(pt.highlightIntensity, 1 - distToScan / 24);
        } else {
          pt.highlightIntensity *= 0.94; // Smooth decay
        }

        // Perspective projection
        const scale = fov / (fov + z2 + 100);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        return {
          projX,
          projY,
          depth: z2,
          scale,
          y2,
          highlight: pt.highlightIntensity,
        };
      });

      // Sort by depth for correct 3D rendering
      const sortedIndices = projected
        .map((p, idx) => ({ idx, depth: p.depth }))
        .sort((a, b) => b.depth - a.depth);

      // Draw subtle orbital rings
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.15, radius * 0.45, effectiveAngleY * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(235, 232, 228, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.restore();

      // Draw lattice connections between nearby points
      for (let i = 0; i < points.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < points.length; j++) {
          const p2 = projected[j];
          const dx = p1.projX - p2.projX;
          const dy = p1.projY - p2.projY;
          const dist2D = Math.sqrt(dx * dx + dy * dy);

          if (dist2D < 48 * p1.scale) {
            const avgHighlight = (p1.highlight + p2.highlight) / 2;
            ctx.beginPath();
            ctx.moveTo(p1.projX, p1.projY);
            ctx.lineTo(p2.projX, p2.projY);

            if (avgHighlight > 0.3) {
              // Active scanner line illumination: violet/orange restrained accents
              ctx.strokeStyle = avgHighlight > 0.6
                ? `rgba(4, 71, 255, ${0.45 * avgHighlight})`
                : `rgba(255, 71, 4, ${0.35 * avgHighlight})`;
              ctx.lineWidth = 1.2;
            } else {
              // Elegant editorial charcoal/silver wireframe
              const alpha = Math.max(0.06, (p1.depth + 180) / 450 * 0.22);
              ctx.strokeStyle = `rgba(119, 113, 105, ${alpha})`;
              ctx.lineWidth = 0.75;
            }
            ctx.stroke();
          }
        }
      }

      // Draw scanning laser plane line across the sphere
      const scanProjY = centerY + scanPlaneY * 0.85;
      const scanWidth = radius * 1.5;

      const scanGrad = ctx.createLinearGradient(centerX - scanWidth, scanProjY, centerX + scanWidth, scanProjY);
      scanGrad.addColorStop(0, 'rgba(4, 71, 255, 0)');
      scanGrad.addColorStop(0.3, 'rgba(4, 71, 255, 0.4)');
      scanGrad.addColorStop(0.5, 'rgba(255, 71, 4, 0.6)');
      scanGrad.addColorStop(0.7, 'rgba(4, 71, 255, 0.4)');
      scanGrad.addColorStop(1, 'rgba(4, 71, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(centerX - scanWidth, scanProjY);
      ctx.lineTo(centerX + scanWidth, scanProjY);
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw code nodes / vertices
      for (const item of sortedIndices) {
        const p = projected[item.idx];
        const baseRadius = 2.4 * p.scale;

        ctx.beginPath();
        if (p.highlight > 0.3) {
          // Highlighted scanning state
          const isViolet = item.idx % 2 === 0;
          ctx.arc(p.projX, p.projY, baseRadius * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = isViolet
            ? `rgba(4, 71, 255, ${0.9 * p.highlight})`
            : `rgba(255, 71, 4, ${0.9 * p.highlight})`;
          ctx.fill();

          // Subtle bloom aura
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, baseRadius * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = isViolet
            ? `rgba(4, 71, 255, ${0.2 * p.highlight})`
            : `rgba(255, 71, 4, ${0.2 * p.highlight})`;
          ctx.fill();
        } else {
          // Default architectural node
          const alpha = Math.max(0.2, (p.depth + 180) / 450 * 0.85);
          ctx.arc(p.projX, p.projY, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.targetX = normX;
      mouseRef.current.targetY = normY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      className="relative w-full aspect-square max-w-[480px] mx-auto flex items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-editorial-warm/60 via-transparent to-editorial-warm/40 blur-2xl opacity-70 pointer-events-none" />

      {/* Interactive 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Subtle technical telemetry label */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 bg-editorial-bg/90 backdrop-blur border border-editorial-divider rounded-full text-[10px] font-mono text-editorial-muted">
        <span className="w-1.5 h-1.5 rounded-full bg-editorial-violet animate-pulse" />
        <span>DYNAMIC SECURITY MESH · 60 FPS</span>
      </div>
    </div>
  );
}
