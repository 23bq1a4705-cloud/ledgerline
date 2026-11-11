import React from 'react';

export type IconName = 'piggy' | 'coin' | 'wallet' | 'plane' | 'shield' | 'lock';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', color }) => {
  switch (name) {
    case 'piggy':
      // Cute pink piggy bank with coin slot
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Back leg */}
          <rect x="14" y="36" width="6" height="8" rx="3" fill="#f8b4c4" />
          <rect x="28" y="36" width="6" height="8" rx="3" fill="#f8b4c4" />
          {/* Curly tail */}
          <path
            d="M8 24 C5 21 6 16 10 18 C13 20 10 24 8 22"
            stroke="#f498af"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Main Piggy Body */}
          <ellipse cx="25" cy="27" rx="17" ry="13" fill={color || '#ffccd8'} />
          {/* Belly shadow / depth */}
          <path
            d="M12 30 C15 37 35 37 38 30 C36 38 14 38 12 30 Z"
            fill="#f7b0c3"
            opacity="0.6"
          />
          {/* Front legs */}
          <rect x="18" y="37" width="5.5" height="7" rx="2.5" fill="#f498af" />
          <rect x="32" y="37" width="5.5" height="7" rx="2.5" fill="#f498af" />
          {/* Ear */}
          <path
            d="M32 17 C32 12 37 11 39 15 C41 19 37 20 32 17 Z"
            fill="#f498af"
          />
          {/* Eye */}
          <circle cx="36" cy="24" r="1.8" fill="#3b3552" />
          <circle cx="36.6" cy="23.4" r="0.6" fill="#ffffff" />
          {/* Snout */}
          <ellipse cx="41" cy="28" rx="4.5" ry="3.5" fill="#f498af" />
          <circle cx="39.8" cy="28" r="0.9" fill="#9d435d" />
          <circle cx="42.2" cy="28" r="0.9" fill="#9d435d" />
          {/* Rosy Cheek */}
          <circle cx="33" cy="28" r="2.2" fill="#ff99b3" opacity="0.6" />
          {/* Coin Slot */}
          <rect x="21" y="14" width="8" height="2" rx="1" fill="#783446" />
          {/* Golden Coin dropping in */}
          <ellipse cx="25" cy="11" rx="4" ry="2.2" fill="#ffd166" stroke="#e09f2b" strokeWidth="1" />
        </svg>
      );

    case 'coin':
      // Smiling cute gold coin
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Outer Coin Rim */}
          <circle cx="24" cy="24" r="20" fill={color || '#ffe396'} stroke="#e5ad35" strokeWidth="2.5" />
          {/* Inner Coin Border */}
          <circle cx="24" cy="24" r="16" fill="#fff0b8" />
          {/* Sparkle top right */}
          <path
            d="M36 12 L37.2 15 L40 16 L37.2 17 L36 20 L34.8 17 L32 16 L34.8 15 Z"
            fill="#ffffff"
          />
          {/* Smiling Eyes */}
          <path
            d="M18 21 C18 19 21 19 21 21"
            stroke="#473a2b"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M27 21 C27 19 30 19 30 21"
            stroke="#473a2b"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Cute Open Smile */}
          <path
            d="M21 26 C21 29 27 29 27 26"
            stroke="#473a2b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Rosy Cheeks */}
          <ellipse cx="16" cy="24" rx="2" ry="1.2" fill="#ffb4a2" opacity="0.8" />
          <ellipse cx="32" cy="24" rx="2" ry="1.2" fill="#ffb4a2" opacity="0.8" />
        </svg>
      );

    case 'wallet':
      // Lavender cute wallet with stitched borders and clasp
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Peeking card / cash */}
          <rect x="12" y="10" width="22" height="12" rx="3" fill="#b9f0d8" />
          <rect x="15" y="13" width="14" height="2" rx="1" fill="#2d8a63" opacity="0.4" />
          {/* Main Wallet Base */}
          <rect x="7" y="16" width="34" height="24" rx="6" fill={color || '#b8a9f5'} />
          {/* Wallet Flap Depth */}
          <path
            d="M7 21 C15 21 33 21 41 21"
            stroke="#9f8ee6"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          {/* Wallet Clasp / Tab */}
          <path
            d="M30 24 H42 C43.1 24 44 24.9 44 26 V32 C44 33.1 43.1 34 42 34 H30 C28.9 34 28 33.1 28 32 V26 C28 24.9 28.9 24 30 24 Z"
            fill="#d6ccff"
          />
          {/* Golden Clasp Button */}
          <circle cx="33" cy="29" r="2.5" fill="#ffe5c7" stroke="#e8a855" strokeWidth="1" />
        </svg>
      );

    case 'plane':
      // Mint paper airplane
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Airplane main wing */}
          <path
            d="M7 24 L41 9 L27 41 L22 28 Z"
            fill={color || '#b9f0d8'}
            stroke="#2e8561"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Airplane fold shadow */}
          <path
            d="M22 28 L41 9 L27 41 Z"
            fill="#9be6c4"
            opacity="0.8"
          />
          {/* Center crease */}
          <path
            d="M7 24 L41 9"
            stroke="#216a4c"
            strokeWidth="1.2"
          />
          {/* Trailing dotted line */}
          <path
            d="M4 33 C8 35 12 31 16 33"
            stroke="#2e8561"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        </svg>
      );

    case 'shield':
      // Soft green shield with clean white check
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Shield Base */}
          <path
            d="M24 6 L38 12 C38 26 31 37 24 42 C17 37 10 26 10 12 Z"
            fill={color || '#c2f3dc'}
            stroke="#227a52"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Inner Shield Shade */}
          <path
            d="M24 9 L35 14 C35 25 29 34 24 38 Z"
            fill="#9eedc6"
            opacity="0.5"
          />
          {/* Crisp Check Mark */}
          <path
            d="M17 23 L22 28 L31 18"
            stroke="#1d6644"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'lock':
      // Soft lavender/sky padlock
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Shackle */}
          <path
            d="M16 20 V14 C16 9.6 19.6 6 24 6 C28.4 6 32 9.6 32 14 V20"
            stroke="#5f5682"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Body */}
          <rect
            x="11"
            y="19"
            width="26"
            height="22"
            rx="6"
            fill={color || '#a8dadc'}
            stroke="#37686d"
            strokeWidth="2"
          />
          {/* Keyhole */}
          <circle cx="24" cy="28" r="2.8" fill="#2b5257" />
          <path d="M23 29 L22 34 H26 L25 29 Z" fill="#2b5257" />
        </svg>
      );

    default:
      return null;
  }
};

interface IconTileProps {
  name: IconName;
  size?: number; // 36 to 52
  bg?: string;
  className?: string;
}

export const IconTile: React.FC<IconTileProps> = ({
  name,
  size = 44,
  bg = 'var(--primary-light)',
  className = '',
}) => {
  const iconSize = Math.round(size * 0.58);
  return (
    <div
      className={`icon-tile ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: Math.round(size * 0.35),
        backgroundColor: bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(59, 53, 82, 0.06)',
        transition: 'transform 0.18s ease',
      }}
    >
      <Icon name={name} size={iconSize} />
    </div>
  );
};

export default Icon;

