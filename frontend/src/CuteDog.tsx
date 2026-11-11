import React from 'react';

interface CuteDogProps {
  className?: string;
  flip?: boolean; // true to flip facing direction
}

export const CuteDog: React.FC<CuteDogProps> = ({ className = '', flip = false }) => {
  return (
    <div
      className={`cute-dog-wrapper ${className}`}
      aria-label="A friendly chubby golden puppy sitting happily"
      role="img"
      style={{
        width: 190,
        height: 143,
        position: 'relative',
        pointerEvents: 'none',
        userSelect: 'none',
        transform: flip ? 'scaleX(-1)' : 'scaleX(1)',
        transformOrigin: 'center center',
      }}
    >
      {/* Occasional floating heart */}
      <div className="dog-floating-heart" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffccd8">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      <svg
        width="190"
        height="143"
        viewBox="0 0 190 143"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cute-dog-svg"
      >
        {/* 1. Ground Shadow (Fixed sitting puddle) */}
        <ellipse
          cx="95"
          cy="134"
          rx="56"
          ry="7"
          fill="rgba(59, 53, 82, 0.12)"
          className="dog-ground-shadow"
        />

        {/* 2. Fluffy Wagging Tail */}
        <g className="dog-fluffy-tail" style={{ transformOrigin: '38px 84px' }}>
          <path
            d="M38 84 C22 76 10 58 14 42 C16 34 26 36 27 44 C29 56 36 72 48 78 Z"
            fill="#f7b752"
          />
          {/* Fluffy Cream Tail Tip */}
          <path
            d="M14 42 C16 34 26 36 27 44 C25 47 22 49 19 52 C17 48 15 45 14 42 Z"
            fill="#fff8ee"
          />
        </g>

        {/* 3. Seated Body & Rear Haunches (Fixed seated pose) */}
        <g>
          {/* Rear Haunch (sitting) */}
          <ellipse cx="64" cy="98" rx="26" ry="22" fill="#e9a43e" />
          <path
            d="M44 116 C44 112 50 110 58 110 H74 C78 110 82 114 82 118 C82 124 76 128 64 128 H54 C48 128 44 123 44 116 Z"
            fill="#f7b752"
          />
          {/* Rear Paw Cream */}
          <path
            d="M52 120 C52 116 58 116 66 116 H76 C79 116 82 118 82 120 C82 124 78 127 70 127 H58 C54 127 52 124 52 120 Z"
            fill="#fff8ee"
          />

          {/* Chubby Torso */}
          <path
            d="M50 78 C50 62 64 54 86 54 L118 56 C134 56 142 68 142 86 C142 108 128 118 108 118 L76 118 C56 118 50 100 50 78 Z"
            fill="#f7b752"
          />

          {/* Soft Cream Belly & Chest */}
          <path
            d="M74 68 C86 68 108 72 116 84 C120 90 116 112 108 116 L78 116 C62 116 58 98 64 86 C67 80 70 68 74 68 Z"
            fill="#fff8ee"
          />
        </g>

        {/* 4. Front Paws (Planted firmly on ground, no swinging) */}
        <g>
          {/* Far Front Leg (sitting plant) */}
          <rect x="98" y="86" width="14" height="38" rx="7" fill="#df9834" />
          <path
            d="M96 116 C96 113 100 112 106 112 H112 C116 112 118 115 118 118 C118 122 114 125 108 125 H102 C98 125 96 121 96 116 Z"
            fill="#fff5e4"
          />

          {/* Near Front Leg (sitting plant) */}
          <rect x="114" y="86" width="15" height="38" rx="7.5" fill="#f7b752" />
          <path
            d="M112 116 C112 113 116 112 122 112 H128 C132 112 135 115 135 118 C135 123 130 126 124 126 H118 C114 126 112 122 112 116 Z"
            fill="#fff8ee"
          />
        </g>

        {/* 5. Big Round Head with Gentle Sway */}
        <g className="dog-head-sway" style={{ transformOrigin: '128px 78px' }}>
          {/* Big Round Head */}
          <circle cx="128" cy="48" r="35" fill="#f7b752" />

          {/* Chubby Cream Muzzle / Snout */}
          <ellipse cx="148" cy="56" rx="19" ry="14" fill="#fff8ee" />

          {/* Pink Collar with Golden Jingle Bell */}
          <path
            d="M102 68 C110 78 132 80 146 70 L144 77 C130 86 108 84 100 74 Z"
            fill="#ffccd8"
            stroke="#f7a7bb"
            strokeWidth="0.8"
          />
          {/* Gold Bell */}
          <circle cx="124" cy="82" r="6" fill="#ffd166" stroke="#e09f2b" strokeWidth="1.2" />
          <circle cx="124" cy="84" r="1.4" fill="#78480b" />

          {/* Heart-Shaped Little Black Nose */}
          <path
            d="M161 48 C161 46 164 46 165 48 C166 46 169 46 169 48 C169 51 165 54 165 54 C165 54 161 51 161 48 Z"
            fill="#2a233b"
          />

          {/* Big Sparkly Eyes */}
          <g className="dog-eye-blink" style={{ transformOrigin: '136px 40px' }}>
            <circle cx="136" cy="40" r="6.5" fill="#2a233b" />
            {/* Sparkle Glints */}
            <circle cx="138.5" cy="37.5" r="2.4" fill="#ffffff" />
            <circle cx="134" cy="42" r="1.3" fill="#ffffff" />
          </g>

          {/* Rosy Pink Blush Cheeks */}
          <ellipse cx="127" cy="54" rx="5.5" ry="4" fill="#ff9ebb" opacity="0.6" />
          <ellipse cx="155" cy="61" rx="5" ry="3.5" fill="#ff9ebb" opacity="0.6" />

          {/* Floppy Brown Ear (Gentle Ear Flop) */}
          <g className="dog-ear-flop" style={{ transformOrigin: '112px 26px' }}>
            <path
              d="M112 24 C122 22 128 30 126 44 C124 56 114 64 106 62 C98 60 98 50 102 40 C106 32 108 26 112 24 Z"
              fill="#ba7824"
            />
            <path
              d="M110 30 C116 30 120 36 118 46 C116 52 110 56 106 54 C104 52 104 46 106 40 Z"
              fill="#9e6014"
              opacity="0.35"
            />
          </g>

          {/* Pink Bow with Wiggle */}
          <g className="dog-bow-wiggle" style={{ transformOrigin: '116px 22px' }}>
            {/* Left Bow Loop */}
            <path
              d="M116 22 C110 16 104 18 108 25 C110 28 114 26 116 22 Z"
              fill="#ffb4c6"
              stroke="#f492a8"
              strokeWidth="0.8"
            />
            {/* Right Bow Loop */}
            <path
              d="M116 22 C122 16 128 18 124 25 C122 28 118 26 116 22 Z"
              fill="#ffb4c6"
              stroke="#f492a8"
              strokeWidth="0.8"
            />
            {/* Center Knot */}
            <circle cx="116" cy="22" r="3.2" fill="#ffccd8" stroke="#f492a8" strokeWidth="0.8" />
          </g>

          {/* Happy Panting Tongue */}
          <g className="dog-tongue-pant" style={{ transformOrigin: '152px 66px' }}>
            <path
              d="M148 66 C148 66 150 77 154 77 C158 77 158 66 158 66 Z"
              fill="#ff9ebb"
            />
            <line x1="153" y1="66" x2="153" y2="73" stroke="#ea7a99" strokeWidth="1" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default CuteDog;

