import React from 'react';
import { User, Role } from '../types';
import {
  Landmark,
  Activity,
  CreditCard,
  ArrowLeftRight,
  FileText,
  ShieldCheck,
  Shield,
  Layers,
  Users,
  Settings,
  LogOut,
  X,
  ArrowDownLeft,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'vaults'
  | 'movement'
  | 'statements'
  | 'recipient-inflows'
  | 'auditor-proof'
  | 'auditor-inspector'
  | 'auditor-trail'
  | 'admin-telemetry'
  | 'admin-vaults'
  | 'admin-audit';

interface SidebarProps {
  currentUser: User;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isRecipientView?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentTab,
  onSelectTab,
  onOpenSettings,
  onLogout,
  isOpen,
  onClose,
  isRecipientView = false,
}) => {
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getRoleLabel = (role: Role, email: string) => {
    if (email.toLowerCase().includes('bob')) return 'Recipient';
    if (email.toLowerCase().includes('alice')) return 'Customer';
    if (role === 'ADMIN') return 'Administrator';
    if (role === 'AUDITOR') return 'Compliance Auditor';
    return 'Customer';
  };

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Landmark size={20} strokeWidth={2.4} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">LedgerLine</span>
            <span className="sidebar-logo-subtitle">BalanceVault</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="topbar-mobile-toggle"
            style={{ marginLeft: 'auto' }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {/* CUSTOMER / ACCOUNT HOLDER VIEW */}
          {currentUser.role === 'ACCOUNT_HOLDER' && !isRecipientView && (
            <>
              <div className="sidebar-section-title">Banking & Movement</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleNavClick('overview')}
              >
                <Activity size={18} />
                <span>Portfolio Overview</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'movement' ? 'active' : ''}`}
                onClick={() => handleNavClick('movement')}
              >
                <ArrowLeftRight size={18} />
                <span>Move Money</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'vaults' ? 'active' : ''}`}
                onClick={() => handleNavClick('vaults')}
              >
                <CreditCard size={18} />
                <span>Account Vaults</span>
              </button>

              <div className="sidebar-section-title">Ledgers & Compliance</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'statements' ? 'active' : ''}`}
                onClick={() => handleNavClick('statements')}
              >
                <FileText size={18} />
                <span>Statements & Audit</span>
              </button>
            </>
          )}

          {/* RECIPIENT PERSONA (BOB) */}
          {currentUser.role === 'ACCOUNT_HOLDER' && isRecipientView && (
            <>
              <div className="sidebar-section-title">Receivables Hub</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'recipient-inflows' ? 'active' : ''}`}
                onClick={() => handleNavClick('recipient-inflows')}
              >
                <ArrowDownLeft size={18} />
                <span>Incoming Streams</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleNavClick('overview')}
              >
                <Activity size={18} />
                <span>Recipient Accounts</span>
              </button>

              <div className="sidebar-section-title">Settlement Audit</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'statements' ? 'active' : ''}`}
                onClick={() => handleNavClick('statements')}
              >
                <FileText size={18} />
                <span>Receivables Ledger</span>
              </button>
            </>
          )}

          {/* AUDITOR VIEW */}
          {currentUser.role === 'AUDITOR' && (
            <>
              <div className="sidebar-section-title">Mathematical Invariants</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'auditor-proof' ? 'active' : ''}`}
                onClick={() => handleNavClick('auditor-proof')}
              >
                <ShieldCheck size={18} />
                <span>Conservation Proof</span>
                <span className="sidebar-nav-badge badge badge-success">Δ=$0</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'auditor-inspector' ? 'active' : ''}`}
                onClick={() => handleNavClick('auditor-inspector')}
              >
                <Layers size={18} />
                <span>Cross-Vault Inspector</span>
              </button>

              <div className="sidebar-section-title">Compliance Governance</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'auditor-trail' ? 'active' : ''}`}
                onClick={() => handleNavClick('auditor-trail')}
              >
                <Shield size={18} />
                <span>Compliance Audit Log</span>
              </button>
            </>
          )}

          {/* ADMIN VIEW */}
          {currentUser.role === 'ADMIN' && (
            <>
              <div className="sidebar-section-title">System Infrastructure</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'admin-telemetry' ? 'active' : ''}`}
                onClick={() => handleNavClick('admin-telemetry')}
              >
                <Activity size={18} />
                <span>Health Telemetry</span>
                <span className="sidebar-nav-badge badge badge-success">200 OK</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'admin-vaults' ? 'active' : ''}`}
                onClick={() => handleNavClick('admin-vaults')}
              >
                <Users size={18} />
                <span>Vault Governance</span>
              </button>

              <div className="sidebar-section-title">Security & Operations</div>
              <button
                type="button"
                className={`sidebar-nav-item ${currentTab === 'admin-audit' ? 'active' : ''}`}
                onClick={() => handleNavClick('admin-audit')}
              >
                <Shield size={18} />
                <span>Administrative Logs</span>
              </button>
            </>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <button
              type="button"
              className="sidebar-nav-item"
              onClick={onOpenSettings}
            >
              <Settings size={18} />
              <span>Settings & Themes</span>
            </button>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={currentUser.fullName}>
                {currentUser.fullName}
              </div>
              <div className="sidebar-user-role">
                {getRoleLabel(currentUser.role, currentUser.email)}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', marginLeft: 'auto' }}
              title="Sign Out"
            >
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

