import React from 'react';

export const HeroLightBeam: React.FC = () => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10"
      aria-hidden="true"
    >
      {/* Ambient background warm solar flare behind the bend */}
      <div
        className="absolute top-[35%] right-[5%] w-[420px] h-[420px] rounded-full opacity-60 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 60% 60%, rgba(255, 102, 0, 0.45) 0%, rgba(245, 158, 11, 0.2) 40%, rgba(255, 77, 0, 0.05) 70%, transparent 85%)',
          filter: 'blur(55px)',
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Extra ambient top-right down-draft light */}
      <div
        className="absolute top-0 right-[14%] w-[200px] h-[650px] opacity-40 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(255, 120, 0, 0.35) 0%, rgba(245, 158, 11, 0.12) 50%, transparent 80%)',
          filter: 'blur(45px)',
        }}
      />

      {/* Main SVG Light Beam Path */}
      <svg
        className="w-full h-full absolute inset-0 overflow-visible beam-glow-active"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Linear gradient for vertical-to-horizontal light transition */}
          <linearGradient id="beamGradientWide" x1="1180" y1="0" x2="520" y2="690" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff4d00" stopOpacity="0.7" />
            <stop offset="45%" stopColor="#ff7700" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffaa00" stopOpacity="1" />
            <stop offset="88%" stopColor="#ff6600" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff4400" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="beamGradientCore" x1="1180" y1="0" x2="520" y2="690" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffeedd" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="72%" stopColor="#fff8e7" stopOpacity="1" />
            <stop offset="90%" stopColor="#ffe0a3" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffaa00" stopOpacity="0" />
          </linearGradient>

          {/* SVG Glow Filter */}
          <filter id="ultraGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="16" result="blur1" />
            <feGaussianBlur stdDeviation="32" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Path description:
            Start at top-right (x: 1180, y: 0)
            Straight down to y: 560
            Curve leftwards smoothly at corner: C 1180 660, 1120 688, 1000 688
            Then run horizontal along bottom edge to x: 500, y: 688
        */}

        {/* 1. Deepest outer diffuse atmospheric stroke */}
        <path
          d="M 1180 -20 L 1180 540 C 1180 655, 1110 688, 980 688 L 480 688"
          stroke="url(#beamGradientWide)"
          strokeWidth="38"
          strokeLinecap="round"
          opacity="0.32"
          filter="url(#ultraGlow)"
        />

        {/* 2. Middle radiant amber-orange halo */}
        <path
          d="M 1180 -20 L 1180 540 C 1180 655, 1110 688, 980 688 L 480 688"
          stroke="url(#beamGradientWide)"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.75"
          filter="url(#softGlow)"
        />

        {/* 3. Intense secondary beam body */}
        <path
          d="M 1180 -20 L 1180 540 C 1180 655, 1110 688, 980 688 L 480 688"
          stroke="#ff941a"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* 4. Pure incandescent white/gold core */}
        <path
          d="M 1180 -20 L 1180 540 C 1180 655, 1110 688, 980 688 L 480 688"
          stroke="url(#beamGradientCore)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.98"
        />

        {/* Subtle light scatter particles around the bend (mimicking photon diffusion) */}
        <g opacity="0.85">
          <circle cx="1145" cy="625" r="1.5" fill="#fff5d0" opacity="0.9" />
          <circle cx="1165" cy="590" r="1.2" fill="#ffdd80" opacity="0.7" />
          <circle cx="1120" cy="655" r="1.8" fill="#ffffff" opacity="0.95" />
          <circle cx="1090" cy="670" r="1.3" fill="#ffeaa0" opacity="0.8" />
          <circle cx="1040" cy="682" r="1.6" fill="#ffbe66" opacity="0.85" />
          <circle cx="970" cy="692" r="1.2" fill="#ffffff" opacity="0.9" />
          <circle cx="890" cy="688" r="1.5" fill="#ffaa44" opacity="0.75" />
          <circle cx="780" cy="687" r="1.1" fill="#ffdd99" opacity="0.6" />
          <circle cx="1185" cy="510" r="1.3" fill="#fff5cc" opacity="0.7" />
          <circle cx="1176" cy="430" r="1.5" fill="#ffffff" opacity="0.85" />
          <circle cx="1183" cy="320" r="1.2" fill="#ffcc77" opacity="0.65" />
        </g>
      </svg>
    </div>
  );
};
