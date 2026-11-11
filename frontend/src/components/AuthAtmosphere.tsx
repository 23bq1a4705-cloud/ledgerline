import React from 'react';

/**
 * AuthAtmosphere
 * Sophisticated pastel background atmosphere for LedgerLine BalanceVault.
 * Provides subtle geometric ledger grid, sparse transaction topology nodes,
 * and ambient corner glows for both Soft Precision Light & Midnight Precision Dark.
 */
export const AuthAtmosphere: React.FC = () => {
  return (
    <div className="auth-atmosphere-root" aria-hidden="true">
      {/* 1. Large Ambient Corner Glows */}
      <div className="auth-ambient-glow auth-glow-top-left" />
      <div className="auth-ambient-glow auth-glow-top-right" />
      <div className="auth-ambient-glow auth-glow-bottom-left" />
      <div className="auth-ambient-glow auth-glow-bottom-right" />

      {/* 2. Perimeter Ledger Coordinate Grid (Masked at center so form stays 100% clear) */}
      <div className="auth-ledger-grid" />

      {/* 3. Sparse Transaction Topology Vector Nodes & Geometric Rings */}
      <svg
        className="auth-vector-canvas"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle line gradients for transaction connectors */}
          <linearGradient id="arcGradTL" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.10" />
          </linearGradient>

          <linearGradient id="arcGradBR" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.20" />
          </linearGradient>
        </defs>

        {/* --- TOP-LEFT TOPOLOGY & ORBITAL GEOMETRY --- */}
        <g className="auth-topology-tl">
          {/* Faint Concentric Geometric Rings */}
          <circle
            cx="140"
            cy="160"
            r="160"
            stroke="var(--auth-ring-color)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="140"
            cy="160"
            r="260"
            stroke="var(--auth-ring-color)"
            strokeWidth="0.8"
          />

          {/* Curved Transaction Connectors */}
          <path
            d="M 140 160 Q 200 120 280 135"
            stroke="url(#arcGradTL)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 140 160 Q 180 230 250 250"
            stroke="url(#arcGradTL)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 280 135 Q 310 180 250 250"
            stroke="var(--auth-node-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* Sparse Nodes */}
          {/* Primary Root Node */}
          <circle cx="140" cy="160" r="5" fill="var(--primary)" fillOpacity="0.75" />
          <circle cx="140" cy="160" r="11" stroke="var(--primary)" strokeOpacity="0.25" strokeWidth="1.5" />

          {/* Sub-node A */}
          <circle cx="280" cy="135" r="4" fill="var(--accent-blue)" fillOpacity="0.65" />
          <circle cx="280" cy="135" r="8" stroke="var(--accent-blue)" strokeOpacity="0.20" strokeWidth="1" />

          {/* Sub-node B */}
          <circle cx="250" cy="250" r="3.5" fill="var(--accent-teal)" fillOpacity="0.65" />
        </g>

        {/* --- BOTTOM-RIGHT TOPOLOGY & ORBITAL GEOMETRY --- */}
        <g className="auth-topology-br">
          {/* Faint Concentric Geometric Ring */}
          <circle
            cx="1300"
            cy="750"
            r="180"
            stroke="var(--auth-ring-color)"
            strokeWidth="1"
            strokeDasharray="5 7"
          />
          <circle
            cx="1300"
            cy="750"
            r="300"
            stroke="var(--auth-ring-color)"
            strokeWidth="0.8"
          />

          {/* Curved Transaction Connectors */}
          <path
            d="M 1180 720 Q 1240 660 1320 680"
            stroke="url(#arcGradBR)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1320 680 Q 1350 740 1300 810"
            stroke="url(#arcGradBR)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 1180 720 Q 1230 790 1300 810"
            stroke="var(--auth-node-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* Sparse Nodes */}
          {/* Settlement Node X */}
          <circle cx="1180" cy="720" r="4.5" fill="var(--accent-blue)" fillOpacity="0.7" />
          <circle cx="1180" cy="720" r="9" stroke="var(--accent-blue)" strokeOpacity="0.25" strokeWidth="1" />

          {/* Settlement Node Y */}
          <circle cx="1320" cy="680" r="4" fill="var(--primary)" fillOpacity="0.7" />
          <circle cx="1320" cy="680" r="8" stroke="var(--primary)" strokeOpacity="0.2" strokeWidth="1" />

          {/* Settlement Node Z */}
          <circle cx="1300" cy="810" r="3.5" fill="var(--danger)" fillOpacity="0.55" />
        </g>
      </svg>
    </div>
  );
};
