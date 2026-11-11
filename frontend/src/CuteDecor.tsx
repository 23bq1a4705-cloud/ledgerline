import React from 'react';

export const CuteDecor: React.FC = () => {
  return (
    <div
      className="cute-decor-root"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* 1. THREE SOFT DRIFTING CLOUDS */}
      {/* Cloud 1 (Top Left) */}
      <div className="decor-cloud decor-cloud-1" style={{ top: '6%', left: '8%' }}>
        <svg width="110" height="48" viewBox="0 0 110 48" fill="none">
          <path
            d="M20 38 Q10 38 10 28 Q10 20 20 20 Q24 10 38 10 Q48 10 54 18 Q62 14 74 16 Q84 18 86 28 Q96 28 98 34 Q100 40 90 40 L20 40 Z"
            fill="rgba(255, 255, 255, 0.88)"
            stroke="rgba(184, 169, 245, 0.45)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Cloud 2 (Top Right) */}
      <div className="decor-cloud decor-cloud-2" style={{ top: '12%', right: '7%' }}>
        <svg width="130" height="56" viewBox="0 0 130 56" fill="none">
          <path
            d="M24 46 Q12 46 12 34 Q12 24 24 24 Q28 12 46 12 Q58 12 66 22 Q76 17 90 19 Q102 21 104 34 Q116 34 118 41 Q120 48 108 48 L24 48 Z"
            fill="rgba(255, 255, 255, 0.85)"
            stroke="rgba(168, 218, 220, 0.5)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Cloud 3 (Mid Left) */}
      <div className="decor-cloud decor-cloud-3" style={{ top: '48%', left: '3%' }}>
        <svg width="95" height="42" viewBox="0 0 95 42" fill="none">
          <path
            d="M18 34 Q8 34 8 24 Q8 17 18 17 Q22 8 34 8 Q43 8 48 15 Q55 12 65 14 Q74 15 76 24 Q85 24 86 29 Q88 35 78 35 L18 35 Z"
            fill="rgba(255, 255, 255, 0.8)"
            stroke="rgba(255, 214, 224, 0.5)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* 2. FIVE TWINKLING SPARKLES */}
      {/* Sparkle 1 (Gold, near hero) */}
      <div className="decor-sparkle" style={{ top: '18%', left: '26%', animationDelay: '0s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffd166" opacity="0.85">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" />
        </svg>
      </div>

      {/* Sparkle 2 (Lavender, near top center) */}
      <div className="decor-sparkle" style={{ top: '8%', left: '60%', animationDelay: '1.2s' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#b8a9f5" opacity="0.85">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" />
        </svg>
      </div>

      {/* Sparkle 3 (Mint, mid right) */}
      <div className="decor-sparkle" style={{ top: '38%', right: '14%', animationDelay: '2.4s' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#b9f0d8" opacity="0.9">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" />
        </svg>
      </div>

      {/* Sparkle 4 (Peach, lower mid) */}
      <div className="decor-sparkle" style={{ top: '65%', left: '16%', animationDelay: '0.8s' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffe5c7" opacity="0.85">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" />
        </svg>
      </div>

      {/* Sparkle 5 (Sky blue, near right edge) */}
      <div className="decor-sparkle" style={{ top: '78%', right: '22%', animationDelay: '1.8s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#a8dadc" opacity="0.85">
          <path d="M12 2 L14 9 L21 11 L14 13 L12 20 L10 13 L3 11 L10 9 Z" />
        </svg>
      </div>

      {/* 3. THREE FLOATING HEARTS */}
      {/* Heart 1 (Soft Blush) */}
      <div className="decor-heart" style={{ top: '24%', left: '12%', animationDelay: '0s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffd6e0" opacity="0.85">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {/* Heart 2 (Soft Lavender) */}
      <div className="decor-heart" style={{ top: '32%', right: '28%', animationDelay: '1.5s' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="#b8a9f5" opacity="0.85">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {/* Heart 3 (Soft Peach) */}
      <div className="decor-heart" style={{ top: '72%', right: '8%', animationDelay: '2.8s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd6e0" opacity="0.8">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {/* 4. TWO CREAM BONES */}
      {/* Bone 1 */}
      <div
        style={{
          position: 'absolute',
          top: '42%',
          right: '5%',
          transform: 'rotate(-24deg)',
          opacity: 0.65,
        }}
      >
        <svg width="34" height="18" viewBox="0 0 34 18" fill="none">
          <path
            d="M4 4 C1 4 0 7 2 9 C0 11 1 14 4 14 C6 14 7 12 8 11 L26 11 C27 12 28 14 30 14 C33 14 34 11 32 9 C34 7 33 4 30 4 C28 4 27 6 26 7 L8 7 C7 6 6 4 4 4 Z"
            fill="#fff3dc"
            stroke="#d4b48c"
            strokeWidth="1.4"
          />
        </svg>
      </div>

      {/* Bone 2 */}
      <div
        style={{
          position: 'absolute',
          top: '84%',
          left: '18%',
          transform: 'rotate(18deg)',
          opacity: 0.6,
        }}
      >
        <svg width="28" height="15" viewBox="0 0 34 18" fill="none">
          <path
            d="M4 4 C1 4 0 7 2 9 C0 11 1 14 4 14 C6 14 7 12 8 11 L26 11 C27 12 28 14 30 14 C33 14 34 11 32 9 C34 7 33 4 30 4 C28 4 27 6 26 7 L8 7 C7 6 6 4 4 4 Z"
            fill="#fff3dc"
            stroke="#d4b48c"
            strokeWidth="1.4"
          />
        </svg>
      </div>

      {/* 5. TRAIL OF 4 FADING LAVENDER PAW PRINTS (BOTTOM-LEFT) */}
      <div style={{ position: 'absolute', bottom: '28px', left: '24px' }}>
        {/* Paw 1 (faintest) */}
        <div style={{ transform: 'translate(0px, 0px) rotate(-15deg)', opacity: 0.3 }}>
          <PawPrintSvg />
        </div>
        {/* Paw 2 */}
        <div style={{ transform: 'translate(28px, -22px) rotate(10deg)', opacity: 0.45 }}>
          <PawPrintSvg />
        </div>
        {/* Paw 3 */}
        <div style={{ transform: 'translate(56px, -46px) rotate(-10deg)', opacity: 0.6 }}>
          <PawPrintSvg />
        </div>
        {/* Paw 4 (clearest) */}
        <div style={{ transform: 'translate(88px, -70px) rotate(15deg)', opacity: 0.75 }}>
          <PawPrintSvg />
        </div>
      </div>

      {/* 6. SWAYING FLOWER (BOTTOM-RIGHT) */}
      <div
        className="decor-flower"
        style={{
          position: 'absolute',
          bottom: '22px',
          right: '32px',
          transformOrigin: 'bottom center',
        }}
      >
        <svg width="44" height="64" viewBox="0 0 44 64" fill="none">
          {/* Curved Green Stem */}
          <path
            d="M22 62 Q20 40 22 24"
            stroke="#2e8561"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Soft Leaves */}
          <path
            d="M21 44 Q11 40 13 32 Q20 36 21 44 Z"
            fill="#b9f0d8"
            stroke="#2e8561"
            strokeWidth="1"
          />
          <path
            d="M22 36 Q31 32 29 24 Q23 28 22 36 Z"
            fill="#b9f0d8"
            stroke="#2e8561"
            strokeWidth="1"
          />
          {/* Petals (Blush & Peach) */}
          <circle cx="22" cy="14" r="7" fill="#ffd6e0" />
          <circle cx="14" cy="20" r="7" fill="#ffe5c7" />
          <circle cx="30" cy="20" r="7" fill="#ffe5c7" />
          <circle cx="16" cy="28" r="7" fill="#ffd6e0" />
          <circle cx="28" cy="28" r="7" fill="#ffd6e0" />
          {/* Center */}
          <circle cx="22" cy="22" r="5" fill="#ffd166" stroke="#f4a261" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};

const PawPrintSvg = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#b8a9f5">
    {/* Main Pad */}
    <ellipse cx="12" cy="15" rx="5.5" ry="4.5" />
    {/* 4 Toe Pads */}
    <circle cx="6" cy="9" r="2.2" />
    <circle cx="10" cy="6.5" r="2.2" />
    <circle cx="14" cy="6.5" r="2.2" />
    <circle cx="18" cy="9" r="2.2" />
  </svg>
);

export default CuteDecor;

