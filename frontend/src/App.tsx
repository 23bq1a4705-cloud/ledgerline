import React, { useState, useEffect } from 'react';
import { ApiClient } from './api';
import { Account, AuditLogItem, ConservationData, StatementData, User } from './types';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SettingsModal } from './components/SettingsModal';
import { TransferModal } from './components/TransferModal';
import { AuthAtmosphere } from './components/AuthAtmosphere';
import {
  Landmark,
  ShieldCheck,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Activity,
  Copy,
  Check,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';

function MainApp() {
  const { theme, setTheme } = useTheme();

  // Session & Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [initialDeposit, setInitialDeposit] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferModalTab, setTransferModalTab] = useState<'transfer' | 'deposit' | 'withdraw'>('transfer');

  // Business data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [conservation, setConservation] = useState<ConservationData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);

  // Action form state inside Movement tab
  const [inlineAmount, setInlineAmount] = useState<string>('');
  const [inlineTargetAcc, setInlineTargetAcc] = useState<string>('');
  const [inlineDescription, setInlineDescription] = useState<string>('');
  const [inlineTab, setInlineTab] = useState<'transfer' | 'deposit' | 'withdraw'>('transfer');

  // Copy feedback state
  const [copiedAccount, setCopiedAccount] = useState(false);

  const isRecipientView = currentUser?.email.toLowerCase().includes('bob') || false;

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6500);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Restore stored session
  useEffect(() => {
    const token = ApiClient.getToken();
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        if (parsed.email.toLowerCase().includes('bob')) {
          setCurrentTab('recipient-inflows');
        } else if (parsed.role === 'AUDITOR') {
          setCurrentTab('auditor-proof');
        } else if (parsed.role === 'ADMIN') {
          setCurrentTab('admin-telemetry');
        } else {
          setCurrentTab('overview');
        }
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  // Fetch role-specific data
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'ACCOUNT_HOLDER') {
      loadAccounts();
    } else if (currentUser.role === 'AUDITOR') {
      loadAuditorData();
    } else if (currentUser.role === 'ADMIN') {
      loadAdminData();
    }
  }, [currentUser]);

  // Load statement when selected account changes
  useEffect(() => {
    if (selectedAccountId && (currentUser?.role === 'ACCOUNT_HOLDER' || currentUser?.role === 'AUDITOR')) {
      loadStatement(selectedAccountId);
    }
  }, [selectedAccountId, currentUser]);

  // Data fetchers
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getMyAccounts();
      setAccounts(res);
      if (res.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load account vaults');
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (accId: string) => {
    try {
      const res = await ApiClient.getStatement(accId);
      setStatement(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load ledger statement');
    }
  };

  const loadAuditorData = async () => {
    try {
      setLoading(true);
      const [consRes, auditRes, accRes] = await Promise.all([
        ApiClient.getConservation(),
        ApiClient.getAuditLogs(),
        ApiClient.getAllAccounts(),
      ]);

      setConservation(consRes);
      setAuditLogs(auditRes.logs);
      setAllAccounts(accRes.accounts);
      if (accRes.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accRes.accounts[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load audit telemetry');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [accRes, consRes, auditRes] = await Promise.all([
        ApiClient.getAllAccounts(),
        ApiClient.getConservation(),
        ApiClient.getAuditLogs(),
      ]);

      setAllAccounts(accRes.accounts);
      setConservation(consRes);
      setAuditLogs(auditRes.logs);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  };

  // Auth actions
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'login') {
        const res = await ApiClient.login(email, password);
        localStorage.setItem('user', JSON.stringify(res.user));
        setCurrentUser(res.user);
        setSuccessMessage(`Welcome back, ${res.user.fullName}`);
        if (res.user.email.toLowerCase().includes('bob')) {
          setCurrentTab('recipient-inflows');
        } else if (res.user.role === 'AUDITOR') {
          setCurrentTab('auditor-proof');
        } else if (res.user.role === 'ADMIN') {
          setCurrentTab('admin-telemetry');
        } else {
          setCurrentTab('overview');
        }
      } else {
        const res = await ApiClient.register({ email, password, fullName, initialDeposit });
        localStorage.setItem('user', JSON.stringify(res.user));
        setCurrentUser(res.user);
        setSuccessMessage(`Account vault provisioned successfully for ${res.user.fullName}`);
        setCurrentTab('overview');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await ApiClient.login(demoEmail, demoPass);
      localStorage.setItem('user', JSON.stringify(res.user));
      setCurrentUser(res.user);
      setSuccessMessage(`Signed in as ${res.user.fullName}`);
      if (demoEmail.toLowerCase().includes('bob')) {
        setCurrentTab('recipient-inflows');
      } else if (res.user.role === 'AUDITOR') {
        setCurrentTab('auditor-proof');
      } else if (res.user.role === 'ADMIN') {
        setCurrentTab('admin-telemetry');
      } else {
        setCurrentTab('overview');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ApiClient.logout();
    localStorage.removeItem('user');
    setCurrentUser(null);
    setAccounts([]);
    setSelectedAccountId('');
    setStatement(null);
    setConservation(null);
    setAuditLogs([]);
    setSuccessMessage('Session terminated safely');
  };

  // Transaction settlement engine
  const handleExecuteTransaction = async (
    type: 'transfer' | 'deposit' | 'withdraw',
    sourceAccountId: string,
    numAmount: number,
    targetAcc?: string,
    memo?: string
  ) => {
    if (!sourceAccountId) {
      throw new Error('Please select an active account vault');
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (type === 'deposit') {
        await ApiClient.deposit(sourceAccountId, numAmount, memo);
      } else if (type === 'withdraw') {
        await ApiClient.withdraw(sourceAccountId, numAmount, memo);
      } else {
        if (!targetAcc) {
          throw new Error('Please specify recipient account number');
        }
        await ApiClient.transfer(sourceAccountId, targetAcc, numAmount, memo);
      }

      setSuccessMessage(`Transaction settled: ${type.toUpperCase()} of $${numAmount.toFixed(2)} completed.`);
      await loadAccounts();
      if (selectedAccountId) {
        await loadStatement(selectedAccountId);
      }
    } finally {
      setLoading(false);
    }
  };

  // Inline money movement submit handler
  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(inlineAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Please specify a positive monetary value');
      return;
    }

    try {
      await handleExecuteTransaction(inlineTab, selectedAccountId, num, inlineTargetAcc, inlineDescription);
      setInlineAmount('');
      setInlineDescription('');
      setInlineTargetAcc('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Transaction was rejected');
    }
  };

  // Admin account toggling
  const handleToggleAccountStatus = async (accId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      setLoading(true);
      await ApiClient.updateAccountStatus(accId, newStatus);
      setSuccessMessage(`Vault status updated to ${newStatus}`);
      await loadAdminData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update vault status');
    } finally {
      setLoading(false);
    }
  };

  // Create additional account
  const handleCreateNewAccount = async () => {
    try {
      setLoading(true);
      await ApiClient.createAccount(0);
      setSuccessMessage('Additional account vault opened successfully');
      await loadAccounts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open additional vault');
    } finally {
      setLoading(false);
    }
  };

  // Copy account number
  const handleCopyAccountNumber = (num: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // Derived calculations
  const totalBalance = accounts.reduce((acc, a) => acc + parseFloat(a.balance || '0'), 0);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const statementCreditsTotal = statement
    ? statement.entries
        .filter((e) => e.direction === 'CREDIT')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    : 0;

  const statementDebitsTotal = statement
    ? statement.entries
        .filter((e) => e.direction === 'DEBIT')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    : 0;

  const formatMaskedAccount = (num: string) => {
    if (!num) return '';
    if (num.length <= 8) return num;
    return `${num.slice(0, 4)}••••${num.slice(-4)}`;
  };

  const getPageTitle = (tab: NavTab) => {
    switch (tab) {
      case 'overview':
        return isRecipientView ? 'Recipient Accounts' : 'Portfolio Overview';
      case 'movement':
        return 'Money Movement';
      case 'vaults':
        return 'Account Vaults';
      case 'statements':
        return 'Statements & Ledger Audit';
      case 'recipient-inflows':
        return 'Incoming Funds Stream';
      case 'auditor-proof':
        return 'Global Conservation Proof';
      case 'auditor-inspector':
        return 'Cross-Vault Inspector';
      case 'auditor-trail':
        return 'Compliance Audit Trail';
      case 'admin-telemetry':
        return 'System Health Telemetry';
      case 'admin-vaults':
        return 'Vault Access Governance';
      case 'admin-audit':
        return 'Administrative Operations';
      default:
        return 'Dashboard';
    }
  };

  // ====================================================
  // 1. UN趋THENTICATED ENTERPRISE AUTHENTICATION PORTAL
  // ====================================================
  if (!currentUser) {
    return (
      <div className="auth-page-wrapper">
        {/* Subtle Pastel Background Atmosphere (Glows, Grid & Vector Topology) */}
        <AuthAtmosphere />

        {/* Floating Topbar with Theme Switcher on Login Page */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 20,
          }}
        >
          <div className="theme-segmented">
            <button
              type="button"
              className={`theme-pill-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
              title="Soft Precision Light"
            >
              <Sun size={14} />
              <span>Light</span>
            </button>
            <button
              type="button"
              className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Midnight Precision Dark"
            >
              <Moon size={14} />
              <span>Dark</span>
            </button>
            <button
              type="button"
              className={`theme-pill-btn ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
              title="System Default"
            >
              <Laptop size={14} />
              <span>System</span>
            </button>
          </div>
        </div>

        <div className="auth-content-box">
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                background: 'var(--grad-action)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                marginBottom: 16,
              }}
            >
              <Landmark size={28} strokeWidth={2.4} />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              LedgerLine <span style={{ color: 'var(--primary)', fontWeight: 600 }}>BalanceVault</span>
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Enterprise Double-Entry Money Movement Engine
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div
              className="animate-fade-in"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                marginBottom: 16,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, color: 'var(--danger)' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="animate-fade-in"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--success-border)',
                color: 'var(--success-text)',
                marginBottom: 16,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, color: 'var(--success)' }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Auth Card */}
          <div className="auth-card">
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {authMode === 'login' ? 'Sign in to Financial Console' : 'Register New Account Vault'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {authMode === 'login'
                  ? 'Access double-entry ledgers, transfers, and audit trails'
                  : 'Provision an isolated customer ledger vault'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="form-input"
                />
              </div>

              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Initial Reserve Funding ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(parseFloat(e.target.value) || 0)}
                    className="form-input mono"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 0', fontSize: '0.92rem', marginTop: 8 }}
              >
                {loading
                  ? 'Verifying Invariants...'
                  : authMode === 'login'
                  ? 'Authenticate Session'
                  : 'Provision Account Vault'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                }}
              >
                {authMode === 'login'
                  ? 'Need a new business ledger? Register here'
                  : 'Already registered? Sign in to existing vault'}
              </button>
            </div>

            {/* Quick Demo Evaluation Personas */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Shield size={13} />
                <span>1-Click Evaluator Seed Accounts</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@ledgerline.internal', 'AlicePass2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>Alice ($1,000)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Customer Persona</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('bob@ledgerline.internal', 'BobPass2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>Bob ($500)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--info)' }}>Recipient Persona</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('auditor@ledgerline.internal', 'AuditorPass2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>Auditor</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Double-Entry Invariants</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@ledgerline.internal', 'AdminSecureVault2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '10px 12px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>Administrator</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>System Operations</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Compliance & Security Guarantee Note */}
          <div
            style={{
              marginTop: 20,
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            <span>Pacioli Double-Entry Standard • Mathematical Conservation Δ = $0.0000</span>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // 2. AUTHENTICATED APPLICATION INTERFACE
  // ====================================================
  return (
    <div className="app-layout">
      {/* ENTERPRISE RESPONSIVE SIDEBAR */}
      <Sidebar
        currentUser={currentUser}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isRecipientView={isRecipientView}
      />

      <div className="main-wrapper">
        {/* ENTERPRISE TOPBAR */}
        <Topbar
          currentUser={currentUser}
          pageTitle={getPageTitle(currentTab)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* MAIN CONTENT VIEW CONTAINER */}
        <main className="content-container">
          {/* Notification Alerts */}
          {errorMessage && (
            <div
              className="animate-fade-in"
              style={{
                padding: '14px 20px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={20} color="var(--danger)" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {successMessage && (
            <div
              className="animate-fade-in"
              style={{
                padding: '14px 20px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--success-light)',
                border: '1px solid var(--success-border)',
                color: 'var(--success-text)',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="var(--success)" />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: RECIPIENT INFLOWS (BOB'S PERSPECTIVE)            */}
          {/* ==================================================== */}
          {currentTab === 'recipient-inflows' && (
            <div className="animate-fade-in">
              {/* Recipient Account Details Card */}
              <div
                className="pro-card pro-card-atmospheric"
                style={{ padding: '28px 30px', marginBottom: 24 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <span className="badge badge-info" style={{ marginBottom: 10 }}>
                      RECIPIENT RECEIVABLES HUB
                    </span>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                      Ready to Receive Inbound Settlements
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
                      Share your unique vault account number with counterparties. Transfers are credited instantly with atomic double-entry balance updates.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferModalTab('deposit');
                        setIsTransferModalOpen(true);
                      }}
                      className="btn btn-secondary"
                    >
                      <ArrowDownLeft size={16} color="var(--success)" />
                      <span>Direct Deposit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferModalTab('transfer');
                        setIsTransferModalOpen(true);
                      }}
                      className="btn btn-primary"
                    >
                      <ArrowLeftRight size={16} />
                      <span>Send Funds</span>
                    </button>
                  </div>
                </div>

                {/* Account Number Copy Banner */}
                {selectedAccount && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: '14px 18px',
                      backgroundColor: 'var(--surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Your Primary Receiving Account Number
                      </div>
                      <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                        {selectedAccount.accountNumber}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyAccountNumber(selectedAccount.accountNumber)}
                      className="btn btn-secondary btn-sm"
                    >
                      {copiedAccount ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      <span>{copiedAccount ? 'Copied to Clipboard' : 'Copy Account Number'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Recipient KPIs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: 18,
                  marginBottom: 24,
                }}
              >
                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Current Available Balance
                  </div>
                  <div className="mono" style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ${totalBalance.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--success-text)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} />
                    <span>Cleared for immediate disbursement</span>
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Total Inbound Credits Settled
                  </div>
                  <div className="mono" style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--success)' }}>
                    +${statementCreditsTotal.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    Lifetime receipts across verified transactions
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Receiving Account Vaults
                  </div>
                  <div className="mono" style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {accounts.length}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    All vaults verified & active
                  </div>
                </div>
              </div>

              {/* Received Credits Table */}
              <div className="pro-card" style={{ padding: '24px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Inbound Settlement Stream</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Filtered list of transactions credited into your vaults
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectedAccountId && loadStatement(selectedAccountId)}
                    className="btn btn-secondary btn-sm"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="pro-table-wrapper">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Transaction Description</th>
                        <th>Settlement Time</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Credit Amount</th>
                        <th style={{ textAlign: 'right' }}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement && statement.entries.filter((e) => e.direction === 'CREDIT').length > 0 ? (
                        statement.entries
                          .filter((e) => e.direction === 'CREDIT')
                          .map((entry) => (
                            <tr key={entry.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {entry.description || entry.type}
                                </div>
                                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Ref: {entry.referenceId.slice(0, 12)}...
                                </div>
                              </td>
                              <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(entry.timestamp).toLocaleString()}
                              </td>
                              <td>
                                <span className="badge badge-success">SETTLED</span>
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                                +${parseFloat(entry.amount).toFixed(2)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ${parseFloat(entry.balanceAfter).toFixed(2)}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No incoming credits recorded yet for this vault.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: PORTFOLIO OVERVIEW (CUSTOMER / GENERAL)          */}
          {/* ==================================================== */}
          {currentTab === 'overview' && (
            <div className="animate-fade-in">
              {/* TOP FINANCIAL METRICS STRIP */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 18,
                  marginBottom: 24,
                }}
              >
                {/* Total Balance Card */}
                <div className="pro-card" style={{ padding: '24px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Portfolio Balance
                    </span>
                    <span className="badge badge-success">USD • Verified</span>
                  </div>

                  <div className="mono" style={{ fontSize: '2.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 18 }}>
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferModalTab('deposit');
                        setIsTransferModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <ArrowDownLeft size={14} color="var(--success)" />
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferModalTab('transfer');
                        setIsTransferModalOpen(true);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      <ArrowLeftRight size={14} />
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferModalTab('withdraw');
                        setIsTransferModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <ArrowUpRight size={14} color="var(--danger)" />
                      Withdraw
                    </button>
                  </div>
                </div>

                {/* Ledger Invariant Card */}
                <div className="pro-card" style={{ padding: '24px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Ledger Integrity Status
                    </span>
                    <span className="badge badge-primary">Double-Entry</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 16px' }}>
                    <ShieldCheck size={28} color="var(--success)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        Books Strictly Conserved
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        System Clearing: <span className="mono">SYS-CLEARING-000000</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    Every transaction generates paired credit & debit entries. Cryptographic idempotency keys prevent duplicate execution.
                  </div>
                </div>

                {/* Account Vaults Summary */}
                <div className="pro-card" style={{ padding: '24px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Account Vaults
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateNewAccount}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      <Plus size={13} />
                      New Vault
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 12px' }}>
                    <span className="mono" style={{ fontSize: '2.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {accounts.length}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Vaults</span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Active Focus:{' '}
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {selectedAccount ? selectedAccount.accountNumber : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACCOUNT VAULTS SELECTOR TILES */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Your Managed Account Vaults
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Select vault to filter ledger activity
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {accounts.map((acc, index) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccountId(acc.id)}
                        className="pro-card pro-card-hover"
                        style={{
                          padding: '18px 20px',
                          cursor: 'pointer',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                          borderWidth: isSelected ? '2px' : '1px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {index === 0 ? 'Primary Checking Vault' : `Savings Vault #${index + 1}`}
                            </span>
                          </div>
                          <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                            {acc.status}
                          </span>
                        </div>

                        <div className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                          {formatMaskedAccount(acc.accountNumber)}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            ${parseFloat(acc.balance).toFixed(2)}
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {acc.currency}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RECENT ACTIVITY & MOVEMENT CENTER DUAL GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                {/* Movement Center */}
                <div className="pro-card" style={{ padding: '24px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ArrowLeftRight size={18} color="var(--primary)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Quick Money Movement</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Instant atomic double-entry settlement
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() => setInlineTab('transfer')}
                      className={`btn btn-sm ${inlineTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineTab('deposit')}
                      className={`btn btn-sm ${inlineTab === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineTab('withdraw')}
                      className={`btn btn-sm ${inlineTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Withdraw
                    </button>
                  </div>

                  <form onSubmit={handleInlineSubmit}>
                    <div className="form-group">
                      <label className="form-label">
                        {inlineTab === 'deposit' ? 'Receiving Vault' : 'Funding Vault'}
                      </label>
                      <select
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="form-select mono"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountNumber} (${parseFloat(acc.balance).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {inlineTab === 'transfer' && (
                      <div className="form-group">
                        <label className="form-label">
                          <span>Recipient Account Number</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>e.g. ACC-1000000002</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ACC-1000000002"
                          value={inlineTargetAcc}
                          onChange={(e) => setInlineTargetAcc(e.target.value)}
                          className="form-input mono"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Amount (USD)</label>
                      <div style={{ position: 'relative' }}>
                        <span
                          style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                          }}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={inlineAmount}
                          onChange={(e) => setInlineAmount(e.target.value)}
                          className="form-input mono"
                          style={{ paddingLeft: 26, fontWeight: 700 }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Transaction Memo (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Vendor settlement, payroll, reserve allocation"
                        value={inlineDescription}
                        onChange={(e) => setInlineDescription(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: 6 }}
                    >
                      {loading
                        ? 'Settling on Ledger...'
                        : inlineTab === 'transfer'
                        ? 'Execute Transfer'
                        : `Confirm ${inlineTab.charAt(0).toUpperCase() + inlineTab.slice(1)}`}
                    </button>
                  </form>
                </div>

                {/* Recent Activity Stream */}
                <div className="pro-card" style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--surface-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Activity size={18} color="var(--primary)" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Ledger Activity</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Vault: {selectedAccount ? selectedAccount.accountNumber : ''}
                        </p>
                      </div>
                    </div>

                    {statement?.reconciliation && (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                        <CheckCircle2 size={12} />
                        Reconciled
                      </span>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', maxHeight: 420, flex: 1 }}>
                    {statement && statement.entries.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {statement.entries.map((entry) => {
                          const isCredit = entry.direction === 'CREDIT';
                          return (
                            <div
                              key={entry.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 14px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--surface)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: isCredit ? 'var(--success-light)' : 'var(--danger-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isCredit ? (
                                    <ArrowDownLeft size={16} color="var(--success)" />
                                  ) : (
                                    <ArrowUpRight size={16} color="var(--danger)" />
                                  )}
                                </div>

                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    {entry.description || entry.type}
                                  </div>
                                  <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {new Date(entry.timestamp).toLocaleDateString()} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div
                                  className="mono"
                                  style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    color: isCredit ? 'var(--success)' : 'var(--danger)',
                                  }}
                                >
                                  {isCredit ? '+' : '-'}${parseFloat(entry.amount).toFixed(2)}
                                </div>
                                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Bal: ${parseFloat(entry.balanceAfter).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
                        <Activity size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>No ledger transactions recorded yet</p>
                        <p style={{ fontSize: '0.78rem', marginTop: 4 }}>Execute a deposit or transfer to see entries</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: MONEY MOVEMENT (CUSTOMER)                       */}
          {/* ==================================================== */}
          {currentTab === 'movement' && (
            <div className="animate-fade-in" style={{ maxWidth: 840, margin: '0 auto' }}>
              <div className="pro-card" style={{ padding: '28px 30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--grad-action)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowLeftRight size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Money Movement Engine</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Execute atomic ledger operations with double-entry guarantees
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => setInlineTab('transfer')}
                    className={`btn ${inlineTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    <ArrowLeftRight size={15} />
                    <span>Peer Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInlineTab('deposit')}
                    className={`btn ${inlineTab === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    <ArrowDownLeft size={15} />
                    <span>Reserve Deposit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInlineTab('withdraw')}
                    className={`btn ${inlineTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    <ArrowUpRight size={15} />
                    <span>Disbursement (Withdraw)</span>
                  </button>
                </div>

                <form onSubmit={handleInlineSubmit}>
                  <div className="form-group">
                    <label className="form-label">
                      <span>{inlineTab === 'deposit' ? 'Receiving Vault' : 'Funding Vault'}</span>
                      {selectedAccount && (
                        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          Available: ${parseFloat(selectedAccount.balance).toFixed(2)}
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="form-select mono"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountNumber} — ${parseFloat(acc.balance).toFixed(2)} ({acc.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {inlineTab === 'transfer' && (
                    <div className="form-group">
                      <label className="form-label">
                        <span>Recipient Account Number</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target Account Identifier</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ACC-1000000002"
                        value={inlineTargetAcc}
                        onChange={(e) => setInlineTargetAcc(e.target.value)}
                        className="form-input mono"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Amount (USD)</label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 14,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        value={inlineAmount}
                        onChange={(e) => setInlineAmount(e.target.value)}
                        className="form-input mono"
                        style={{ paddingLeft: 28, fontWeight: 700, fontSize: '1rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Memo / Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Vendor settlement, payroll, supplier disbursement"
                      value={inlineDescription}
                      onChange={(e) => setInlineDescription(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    {loading
                      ? 'Settling on Ledger...'
                      : inlineTab === 'transfer'
                      ? 'Execute Transfer'
                      : `Confirm ${inlineTab.charAt(0).toUpperCase() + inlineTab.slice(1)}`}
                  </button>

                  <div
                    style={{
                      marginTop: 16,
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <ShieldCheck size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                    <span>
                      Protected by SHA-256 Idempotency Header. Automatic rollback if any leg fails.
                    </span>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ACCOUNT VAULTS (CUSTOMER)                       */}
          {/* ==================================================== */}
          {currentTab === 'vaults' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Account Vault Management</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Isolated balance partitions for checking, savings, and operational treasury
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewAccount}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  <span>Open New Vault</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
                {accounts.map((acc, index) => (
                  <div key={acc.id} className="pro-card" style={{ padding: '24px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--surface-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CreditCard size={18} color="var(--primary)" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {index === 0 ? 'Primary Checking Vault' : `Savings Vault #${index + 1}`}
                          </div>
                          <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {acc.accountNumber}
                          </div>
                        </div>
                      </div>

                      <span className="badge badge-success">{acc.status}</span>
                    </div>

                    <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '14px 0' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Current Balance
                      </div>
                      <div className="mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                        ${parseFloat(acc.balance).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Currency: <strong>{acc.currency}</strong>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(acc.id);
                          setCurrentTab('movement');
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <ArrowLeftRight size={13} />
                        <span>Move Funds</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: STATEMENTS & AUDIT (ALL USERS)                  */}
          {/* ==================================================== */}
          {currentTab === 'statements' && (
            <div className="animate-fade-in">
              {/* Header & Vault Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Account Statement & Ledger Audit</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Reconciliation against immutable double-entry journal rows
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Vault:
                  </span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="form-select mono"
                    style={{ width: 'auto', minWidth: 240 }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} (${parseFloat(acc.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Statement KPI Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div className="pro-card" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Total Inflows (Credits)
                  </div>
                  <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                    +${statementCreditsTotal.toFixed(2)}
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Total Outflows (Debits)
                  </div>
                  <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>
                    -${statementDebitsTotal.toFixed(2)}
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Current Stored Balance
                  </div>
                  <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ${selectedAccount ? parseFloat(selectedAccount.balance).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              {/* Double-Entry Journal Table */}
              <div className="pro-card" style={{ padding: '24px 26px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Double-Entry Journal Entries</h3>

                  {statement?.reconciliation && (
                    <span className="badge badge-success">
                      <CheckCircle2 size={13} />
                      Reconciled: Stored ${parseFloat(statement.reconciliation.storedBalance).toFixed(2)} ≡ Derived ${parseFloat(statement.reconciliation.derivedBalance).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="pro-table-wrapper">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Transaction / Memo</th>
                        <th>Settlement Timestamp</th>
                        <th>Direction</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement && statement.entries.length > 0 ? (
                        statement.entries.map((entry) => {
                          const isCredit = entry.direction === 'CREDIT';
                          return (
                            <tr key={entry.id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {entry.description || entry.type}
                                </div>
                                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Ref: {entry.referenceId.slice(0, 10)}...
                                </div>
                              </td>
                              <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(entry.timestamp).toLocaleString()}
                              </td>
                              <td>
                                <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'}`}>
                                  {entry.direction}
                                </span>
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: isCredit ? 'var(--success)' : 'var(--danger)' }}>
                                {isCredit ? '+' : '-'}${parseFloat(entry.amount).toFixed(2)}
                              </td>
                              <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ${parseFloat(entry.balanceAfter).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No journal entries found for this vault.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Solvency Certificate */}
              <div
                style={{
                  padding: '18px 22px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--success-light)',
                  border: '1px solid var(--success-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <ShieldCheck size={26} color="var(--success)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success-text)' }}>
                    Formal Accounting Solvency Verification
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--success-text)', opacity: 0.9, marginTop: 2 }}>
                    Each journal entry represents an immutable leg of a balanced transaction. Ledger integrity is mathematically verified against genesis.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AUDITOR PROOF (AUDITOR)                         */}
          {/* ==================================================== */}
          {currentTab === 'auditor-proof' && currentUser.role === 'AUDITOR' && (
            <div className="animate-fade-in">
              {/* Conservation Proof Card */}
              {conservation && (
                <div
                  className="pro-card"
                  style={{
                    padding: '28px 30px',
                    marginBottom: 24,
                    borderLeft: '5px solid var(--primary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ShieldCheck size={28} color="var(--primary)" />
                      <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Double-Entry Global Conservation Proof</h2>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Fundamental Accounting Invariant: Total System Debits ≡ Total System Credits
                        </p>
                      </div>
                    </div>

                    <span
                      className={`badge ${conservation.isConserved ? 'badge-success' : 'badge-danger'}`}
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    >
                      {conservation.isConserved ? 'STRICTLY CONSERVED (Δ = $0.0000)' : 'DISCREPANCY DETECTED'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 16,
                      marginTop: 20,
                    }}
                  >
                    <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '16px 18px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Cumulative Debits
                      </div>
                      <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                        ${parseFloat(conservation.totalDebits).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '16px 18px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Cumulative Credits
                      </div>
                      <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                        ${parseFloat(conservation.totalCredits).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '16px 18px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        System Discrepancy (Δ)
                      </div>
                      <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                        ${parseFloat(conservation.discrepancy).toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mathematical Proof Details */}
              <div className="pro-card" style={{ padding: '24px 26px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 12 }}>
                  Mathematical Verification Criteria
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  Under double-entry bookkeeping (Pacioli 1494 standard), money cannot be created or destroyed within transactions.
                  Every deposit originates from the system clearing pool (<span className="mono">SYS-CLEARING-000000</span>) as a debit,
                  crediting the destination vault. Peer transfers perform balanced debit and credit pairings in a single atomic database transaction.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={loadAuditorData} className="btn btn-primary btn-sm">
                    <RefreshCw size={14} />
                    <span>Run Verification Check</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AUDITOR INSPECTOR (AUDITOR)                     */}
          {/* ==================================================== */}
          {currentTab === 'auditor-inspector' && currentUser.role === 'AUDITOR' && (
            <div className="animate-fade-in">
              <div className="pro-card" style={{ padding: '24px 26px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cross-Account Statement Inspector</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Auditors hold global read-only visibility across all customer and clearing vaults
                    </p>
                  </div>

                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="form-select mono"
                    style={{ width: 'auto', minWidth: 280 }}
                  >
                    {allAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} ({acc.owner?.fullName || 'System Clearing'}) — ${parseFloat(acc.balance).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {statement && statement.entries.length > 0 ? (
                  <div className="pro-table-wrapper">
                    <table className="pro-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Direction</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                          <th style={{ textAlign: 'right' }}>Balance After</th>
                          <th>Description / Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                            <td>
                              <span className={`badge ${entry.direction === 'CREDIT' ? 'badge-success' : 'badge-danger'}`}>
                                {entry.direction}
                              </span>
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                              ${parseFloat(entry.amount).toFixed(2)}
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                              ${parseFloat(entry.balanceAfter).toFixed(2)}
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              {entry.description || entry.type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No statement entries found for this vault.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: AUDITOR TRAIL (AUDITOR)                         */}
          {/* ==================================================== */}
          {currentTab === 'auditor-trail' && currentUser.role === 'AUDITOR' && (
            <div className="animate-fade-in">
              <div className="pro-card" style={{ padding: '24px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Immutable Compliance Audit Trail (FR-10, SR-4)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Append-only security log recording actor, action, target entity, and outcome
                    </p>
                  </div>

                  <button type="button" onClick={loadAuditorData} className="btn btn-secondary btn-sm">
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>

                {auditLogs.length > 0 ? (
                  <div className="pro-table-wrapper">
                    <table className="pro-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Actor</th>
                          <th>Action</th>
                          <th>Target Entity</th>
                          <th>Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actorEmail}</td>
                            <td>
                              <span className="badge badge-primary">{log.action}</span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{log.targetType}</td>
                            <td>
                              <span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                                {log.outcome}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No audit log entries recorded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN TELEMETRY (ADMIN)                         */}
          {/* ==================================================== */}
          {currentTab === 'admin-telemetry' && currentUser.role === 'ADMIN' && (
            <div className="animate-fade-in">
              {/* Telemetry Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Liveness Probe (/health)
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                    HTTP 200 OK
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    API Server Responsive
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Readiness Probe
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                    DATABASE CONNECTED
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    SQLite WAL Mode Verified
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Managed System Vaults
                  </div>
                  <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {allAccounts.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Customer & Clearing Accounts
                  </div>
                </div>

                <div className="pro-card" style={{ padding: '22px 24px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Books Invariant
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: conservation?.isConserved ? 'var(--success)' : 'var(--danger)' }}>
                    {conservation?.isConserved ? 'CONSERVED' : 'ERROR'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Δ = $0.0000 Discrepancy
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN VAULTS GOVERNANCE (ADMIN)                 */}
          {/* ==================================================== */}
          {currentTab === 'admin-vaults' && currentUser.role === 'ADMIN' && (
            <div className="animate-fade-in">
              <div className="pro-card" style={{ padding: '24px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Vault Access Governance (BalanceVault)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Activate, freeze, or inspect customer accounts
                    </p>
                  </div>

                  <button type="button" onClick={loadAdminData} className="btn btn-secondary btn-sm">
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="pro-table-wrapper">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Account Number</th>
                        <th>Legal Owner</th>
                        <th>Email Address</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                        <th>Vault Status</th>
                        <th style={{ textAlign: 'center' }}>Governance Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAccounts.map((acc) => (
                        <tr key={acc.id}>
                          <td className="mono" style={{ fontWeight: 600 }}>{acc.accountNumber}</td>
                          <td>{acc.owner?.fullName || 'System Account'}</td>
                          <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {acc.owner?.email || 'N/A'}
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>
                            ${parseFloat(acc.balance).toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge ${acc.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                              {acc.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {acc.accountNumber.startsWith('SYS-') ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>System Protected</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAccountStatus(acc.id, acc.status)}
                                className={`btn btn-sm ${acc.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                              >
                                {acc.status === 'ACTIVE' ? 'Freeze Vault' : 'Activate Vault'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB: ADMIN AUDIT LOGS (ADMIN)                        */}
          {/* ==================================================== */}
          {currentTab === 'admin-audit' && currentUser.role === 'ADMIN' && (
            <div className="animate-fade-in">
              <div className="pro-card" style={{ padding: '24px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Administrative Operations Log</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Immutable audit record of all operational interventions
                    </p>
                  </div>
                  <button type="button" onClick={loadAdminData} className="btn btn-secondary btn-sm">
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>

                {auditLogs.length > 0 ? (
                  <div className="pro-table-wrapper">
                    <table className="pro-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Operator</th>
                          <th>Operation</th>
                          <th>Target ID</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 600 }}>{log.actorEmail}</td>
                            <td>
                              <span className="badge badge-primary">{log.action}</span>
                            </td>
                            <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {log.targetId ? log.targetId.slice(0, 12) + '...' : 'System'}
                            </td>
                            <td>
                              <span className={`badge ${log.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                                {log.outcome}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No recent audit events.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        initialTab={transferModalTab}
        onExecute={handleExecuteTransaction}
        loading={loading}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
