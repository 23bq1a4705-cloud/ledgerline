import React from 'react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { User } from '../types';
import { X, Sun, Moon, Laptop, Check, UserCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const themeOptions: { mode: ThemeMode; label: string; desc: string; icon: React.ReactNode; bg: string; color: string }[] = [
    {
      mode: 'light',
      label: 'Soft Precision Light',
      desc: 'Lavender & powder blue surfaces with rich indigo typography (#F7F7FC)',
      icon: <Sun size={18} />,
      bg: '#F7F7FC',
      color: '#25263B',
    },
    {
      mode: 'dark',
      label: 'Midnight Precision Dark',
      desc: 'Deep obsidian backdrop with glowing violet & teal accents (#080F1C)',
      icon: <Moon size={18} />,
      bg: '#080F1C',
      color: '#EDF0FA',
    },
    {
      mode: 'system',
      label: 'System Match',
      desc: 'Dynamically adapts to your operating system appearance preference',
      icon: <Laptop size={18} />,
      bg: 'var(--surface-subtle)',
      color: 'var(--text-primary)',
    },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">System Settings & Profile</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Configure visual appearance, profile tokens, and invariant parameters
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: User Profile Card */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
              Authenticated Identity
            </div>
            <div
              style={{
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--grad-brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#25263B',
                    fontWeight: 800,
                  }}
                >
                  <UserCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {currentUser.fullName}
                  </div>
                  <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <span
                className={`badge ${
                  currentUser.role === 'ADMIN'
                    ? 'badge-danger'
                    : currentUser.role === 'AUDITOR'
                    ? 'badge-warning'
                    : 'badge-primary'
                }`}
              >
                {currentUser.role}
              </span>
            </div>
          </div>

          {/* Section 2: Dual Theme Selector */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
              Color Theme Mode
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.mode;
                return (
                  <div
                    key={opt.mode}
                    onClick={() => setTheme(opt.mode)}
                    className="pro-card pro-card-hover"
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                      borderWidth: isSelected ? '2px' : '1px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: opt.bg,
                          color: opt.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border)',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        {opt.icon}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {opt.desc}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: 'var(--primary)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Invariant Engine Specs */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
              Cryptographic Invariants & Engine Parameters
            </div>
            <div
              style={{
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Ledger Architecture</span>
                <span className="badge badge-primary">Pacioli Double-Entry</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Conservation Invariant</span>
                <span className="mono" style={{ color: 'var(--success-text)', fontWeight: 700 }}>
                  Σ Debits ≡ Σ Credits (Δ = $0.0000)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>System Clearing Account</span>
                <span className="mono">SYS-CLEARING-000000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Concurrency Protocol</span>
                <span>SQLite WAL Mode + BUSY_TIMEOUT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
