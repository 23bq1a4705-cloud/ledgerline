import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { User, Role } from '../types';
import { Menu, Sun, Moon, Laptop, Settings, ShieldCheck } from 'lucide-react';

interface TopbarProps {
  currentUser: User;
  pageTitle: string;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentUser,
  pageTitle,
  onOpenSidebar,
  onOpenSettings,
}) => {
  const { theme, setTheme } = useTheme();

  const getRoleBadge = (role: Role, email: string) => {
    if (email.toLowerCase().includes('bob')) {
      return <span className="badge badge-info">RECIPIENT</span>;
    }
    if (role === 'ADMIN') {
      return <span className="badge badge-danger">ADMINISTRATOR</span>;
    }
    if (role === 'AUDITOR') {
      return <span className="badge badge-warning">AUDITOR</span>;
    }
    return <span className="badge badge-primary">CUSTOMER</span>;
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-mobile-toggle"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-breadcrumbs">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>LedgerLine</span>
          <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>/</span>
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Invariant status indicator */}
        <div
          className="hide-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginRight: 8,
          }}
        >
          <ShieldCheck size={14} color="var(--success)" />
          <span>Double-Entry Verified</span>
        </div>

        {/* Role Badge */}
        {getRoleBadge(currentUser.role, currentUser.email)}

        {/* Theme Switcher Segmented Control */}
        <div className="theme-segmented" role="group" aria-label="Theme mode selector">
          <button
            type="button"
            className={`theme-pill-btn ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            title="Soft Precision Light theme"
          >
            <Sun size={14} />
            <span>Light</span>
          </button>

          <button
            type="button"
            className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            title="Midnight Precision Dark theme"
          >
            <Moon size={14} />
            <span>Dark</span>
          </button>

          <button
            type="button"
            className={`theme-pill-btn ${theme === 'system' ? 'active' : ''}`}
            onClick={() => setTheme('system')}
            title="System automatic theme"
          >
            <Laptop size={14} />
            <span>System</span>
          </button>
        </div>

        {/* Settings modal trigger */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="btn btn-secondary btn-sm"
          style={{ padding: '7px 10px' }}
          title="Account Settings & Invariant Specs"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
