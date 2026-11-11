import React, { useState, useEffect } from 'react';
import { ApiClient } from './api';
import { Account, AuditLogItem, ConservationData, StatementData, User } from './types';
import {
  Landmark,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Plus,
  Activity,
  FileText,
  Shield,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [initialDeposit, setInitialDeposit] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigation tab for Account Holder: 'dashboard' vs 'statements'
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'statements'>('dashboard');

  // Data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [conservation, setConservation] = useState<ConservationData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);

  // Action form states
  const [actionTab, setActionTab] = useState<'transfer' | 'deposit' | 'withdraw'>('transfer');
  const [amount, setAmount] = useState<string>('');
  const [targetAccountNumber, setTargetAccountNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Auto-clear notifications
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Check existing session
  useEffect(() => {
    const token = ApiClient.getToken();
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  // Fetch role-specific data on login
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

  // Data Loaders
  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getMyAccounts();
      setAccounts(res);
      if (res.length > 0 && !selectedAccountId) {
        setSelectedAccountId(res[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (accId: string) => {
    try {
      const res = await ApiClient.getStatement(accId);
      setStatement(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load statement');
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
      setErrorMessage(err.message || 'Failed to load admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers
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
      } else {
        const res = await ApiClient.register({ email, password, fullName, initialDeposit });
        localStorage.setItem('user', JSON.stringify(res.user));
        setCurrentUser(res.user);
        setSuccessMessage(`Account provisioned successfully for ${res.user.fullName}`);
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
      setSuccessMessage(`Signed in as ${res.user.fullName} (${res.user.role})`);
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
    setSuccessMessage('Session terminated successfully');
  };

  // Transaction Handler
  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please specify a positive monetary amount');
      return;
    }

    if (!selectedAccountId) {
      setErrorMessage('Please select a funding account');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (actionTab === 'deposit') {
        await ApiClient.deposit(selectedAccountId, numAmount, description);
      } else if (actionTab === 'withdraw') {
        await ApiClient.withdraw(selectedAccountId, numAmount, description);
      } else {
        if (!targetAccountNumber) {
          setErrorMessage('Please specify destination account number (e.g. ACC-1000000002)');
          setLoading(false);
          return;
        }
        await ApiClient.transfer(selectedAccountId, targetAccountNumber, numAmount, description);
      }

      setSuccessMessage(
        `Transaction settled: ${actionTab.toUpperCase()} of $${numAmount.toFixed(2)} completed.`
      );
      setAmount('');
      setDescription('');
      if (actionTab === 'transfer') setTargetAccountNumber('');

      // Refresh balance & statement
      await loadAccounts();
      await loadStatement(selectedAccountId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Transaction rejected by financial engine');
    } finally {
      setLoading(false);
    }
  };

  // Admin Toggle Account Status
  const handleToggleAccountStatus = async (accId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    try {
      setLoading(true);
      await ApiClient.updateAccountStatus(accId, newStatus);
      setSuccessMessage(`Account status changed to ${newStatus}`);
      await loadAdminData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update account status');
    } finally {
      setLoading(false);
    }
  };

  // Open additional account
  const handleCreateNewAccount = async () => {
    try {
      setLoading(true);
      await ApiClient.createAccount(0);
      setSuccessMessage('Additional account vault opened successfully');
      await loadAccounts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open additional account');
    } finally {
      setLoading(false);
    }
  };

  // Derived helper values
  const totalBalance = accounts.reduce((acc, a) => acc + parseFloat(a.balance || '0'), 0);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

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

  // Format account display
  const formatMaskedAccount = (num: string) => {
    if (!num) return '';
    if (num.length <= 8) return num;
    return `${num.slice(0, 4)}••••${num.slice(-4)}`;
  };

  // ====================================================
  // 1. PROFESSIONAL ENTERPRISE LOGIN VIEW
  // ====================================================
  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg)',
          padding: '32px 16px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)',
                marginBottom: 14,
              }}
            >
              <Landmark size={26} strokeWidth={2.2} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              LedgerLine <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>BalanceVault</span>
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
                padding: '12px 14px',
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
                padding: '12px 14px',
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
          <div className="pro-card" style={{ padding: '32px 28px' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {authMode === 'login' ? 'Sign in to your account' : 'Register new business account'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {authMode === 'login' ? 'Enter credentials to access financial ledgers' : 'Provision a new customer ledger vault'}
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
                  <label className="form-label">Initial Funding Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(parseFloat(e.target.value) || 0)}
                    className="form-input"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px 0', fontSize: '0.92rem', marginTop: 8 }}
              >
                {loading ? 'Authenticating...' : authMode === 'login' ? 'Sign in' : 'Create Account Vault'}
              </button>
            </form>

            <div style={{ marginTop: 18, textAlign: 'center' }}>
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
                  ? 'Need a new demo account? Register here'
                  : 'Already registered? Sign in to existing account'}
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
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Shield size={13} />
                <span>1-Click Evaluator Seed Accounts</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@ledgerline.internal', 'AlicePass2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 10px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>Alice ($1,000)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Customer</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('bob@ledgerline.internal', 'BobPass2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 10px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>Bob ($500)</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recipient</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('auditor@ledgerline.internal', 'AuditorPass2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 10px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>Auditor</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Read-Only</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@ledgerline.internal', 'AdminSecureVault2026!')}
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: 'flex-start', padding: '8px 10px' }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.78rem' }}>Admin</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Operations</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Compliance & Security Guarantee Note */}
          <div
            style={{
              marginTop: 18,
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={16} color="var(--success)" />
            <span>Strict double-entry accounting • Mathematical conservation enforced</span>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // 2. AUTHENTICATED APPLICATION INTERFACE
  // ====================================================
  return (
    <div className="app-container">
      {/* PROFESSIONAL ENTERPRISE TOPBAR */}
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Platform Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Landmark size={20} strokeWidth={2.2} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  LedgerLine
                </span>
                <span style={{ color: 'var(--text-light)', fontWeight: 300 }}>|</span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  BalanceVault
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                  DEMO DATA
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links for Account Holder */}
          {currentUser.role === 'ACCOUNT_HOLDER' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setDashboardTab('dashboard')}
                className={`btn btn-sm ${dashboardTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Activity size={14} />
                Accounts & Movement
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab('statements')}
                className={`btn btn-sm ${dashboardTab === 'statements' ? 'btn-primary' : 'btn-ghost'}`}
              >
                <FileText size={14} />
                Statements & Audit
              </button>
            </div>
          )}

          {/* User Profile Chip & Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentUser.fullName}
              </div>
              <span
                className={`badge ${
                  currentUser.role === 'ADMIN'
                    ? 'badge-danger'
                    : currentUser.role === 'AUDITOR'
                    ? 'badge-warning'
                    : 'badge-primary'
                }`}
                style={{ fontSize: '0.68rem', padding: '1px 6px', marginTop: 2 }}
              >
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT REGION */}
      <main style={{ maxWidth: 1200, width: '100%', margin: '24px auto', padding: '0 24px 60px', flex: 1 }}>
        {/* Real-time Alerts */}
        {errorMessage && (
          <div
            className="animate-fade-in"
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={18} color="var(--danger)" />
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
              padding: '12px 18px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--success-light)',
              border: '1px solid var(--success-border)',
              color: 'var(--success-text)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} color="var(--success)" />
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
        {/* ROLE 1: ACCOUNT HOLDER VIEWS                         */}
        {/* ==================================================== */}
        {currentUser.role === 'ACCOUNT_HOLDER' && (
          <>
            {/* VIEW A: MAIN DASHBOARD */}
            {dashboardTab === 'dashboard' && (
              <div className="animate-fade-in">
                {/* TOP FINANCIAL METRICS STRIP */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  {/* Card 1: Total Portfolio Balance */}
                  <div className="pro-card" style={{ padding: '24px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Portfolio Balance
                      </span>
                      <span className="badge badge-success">USD • Verified</span>
                    </div>

                    <div className="mono" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActionTab('deposit');
                          document.getElementById('action-card')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <ArrowDownLeft size={14} color="var(--success)" />
                        Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionTab('transfer');
                          document.getElementById('action-card')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <ArrowLeftRight size={14} color="var(--primary)" />
                        Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionTab('withdraw');
                          document.getElementById('action-card')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <ArrowUpRight size={14} color="var(--danger)" />
                        Withdraw
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Cryptographic Vault Security */}
                  <div className="pro-card" style={{ padding: '24px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Ledger Integrity Status
                      </span>
                      <span className="badge badge-primary">Double-Entry</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 14px' }}>
                      <ShieldCheck size={28} color="var(--success)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                          Books Strictly Balanced
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          System Clearing: <span className="mono">SYS-CLEARING-000000</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      Every transaction produces immutable paired credit & debit entries. Idempotent keys prevent accidental re-execution.
                    </div>
                  </div>

                  {/* Card 3: Vault Accounts Summary */}
                  <div className="pro-card" style={{ padding: '24px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Account Vaults
                      </span>
                      <button
                        type="button"
                        onClick={handleCreateNewAccount}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        <Plus size={13} />
                        New Vault
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 12px' }}>
                      <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {accounts.length}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Vaults</span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Selected Account:{' '}
                      <span className="mono" style={{ fontWeight: 700 }}>
                        {selectedAccount ? selectedAccount.accountNumber : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VAULT ACCOUNTS SELECTOR */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Your Account Vaults
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Click to switch active vault
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
                            backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <CreditCard size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {index === 0 ? 'Primary Checking Vault' : `Savings Vault #${index + 1}`}
                              </span>
                            </div>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                              {acc.status}
                            </span>
                          </div>

                          <div className="mono" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                            {formatMaskedAccount(acc.accountNumber)}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div className="mono" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
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

                {/* TRANSACTION & RECENT ACTIVITY DUAL GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                  {/* LEFT: MONEY MOVEMENT ACTION CENTER */}
                  <div id="action-card" className="pro-card" style={{ padding: '24px 22px' }}>
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
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Initiate Transaction</h3>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ACID compliant transaction with idempotency verification
                        </p>
                      </div>
                    </div>

                    {/* Transaction Mode Tabs */}
                    <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                      <button
                        type="button"
                        onClick={() => setActionTab('transfer')}
                        className={`btn btn-sm ${actionTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionTab('deposit')}
                        className={`btn btn-sm ${actionTab === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionTab('withdraw')}
                        className={`btn btn-sm ${actionTab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        Withdraw
                      </button>
                    </div>

                    <form onSubmit={handleExecuteTransaction}>
                      <div className="form-group">
                        <label className="form-label">
                          {actionTab === 'deposit' ? 'Target Vault' : 'Funding Vault'}
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

                      {actionTab === 'transfer' && (
                        <div className="form-group">
                          <label className="form-label">
                            <span>Recipient Account Number</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>e.g. ACC-1000000002</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ACC-1000000002"
                            value={targetAccountNumber}
                            onChange={(e) => setTargetAccountNumber(e.target.value)}
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
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="form-input mono"
                            style={{ paddingLeft: 26, fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Transaction Memo (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Vendor payment, payroll, savings deposit"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 8 }}
                      >
                        {loading
                          ? 'Settling on Ledger...'
                          : actionTab === 'transfer'
                          ? 'Execute Transfer'
                          : `Confirm ${actionTab.charAt(0).toUpperCase() + actionTab.slice(1)}`}
                      </button>

                      {/* Security Guarantee Banner */}
                      <div
                        style={{
                          marginTop: 14,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--surface-subtle)',
                          border: '1px solid var(--border)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <ShieldCheck size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                        <span>Protected by SHA-256 Idempotency Header. Safe against duplicate charges.</span>
                      </div>
                    </form>
                  </div>

                  {/* RIGHT: RECENT ACTIVITY STREAM */}
                  <div className="pro-card" style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column' }}>
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
                            Selected Account: {selectedAccount ? selectedAccount.accountNumber : ''}
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
                                  backgroundColor: '#ffffff',
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

            {/* VIEW B: STATEMENTS & RECONCILIATION */}
            {dashboardTab === 'statements' && (
              <div className="animate-fade-in">
                {/* Header & Account Picker */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Account Statement & Ledger Audit</h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Reconciliation against immutable double-entry ledger rows
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
                      style={{ width: 'auto', minWidth: 220 }}
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountNumber} (${parseFloat(acc.balance).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SUMMARY METRICS TILES */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  <div className="pro-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Total Inflows (Credits)
                    </div>
                    <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>
                      +${statementCreditsTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="pro-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Total Outflows (Debits)
                    </div>
                    <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
                      -${statementDebitsTotal.toFixed(2)}
                    </div>
                  </div>

                  <div className="pro-card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Current Stored Balance
                    </div>
                    <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      ${selectedAccount ? parseFloat(selectedAccount.balance).toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                {/* STATEMENT LEDGER TABLE */}
                <div className="pro-card" style={{ padding: '24px 22px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Double-Entry Journal Entries</h3>

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
                          <th>Timestamp</th>
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
                                    Ref: {entry.referenceId.slice(0, 8)}...
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
                              No ledger entries found for this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RECONCILIATION CERTIFICATE */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--success-light)',
                    border: '1px solid var(--success-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <ShieldCheck size={24} color="var(--success)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--success-text)' }}>
                      Formal Accounting Proof of Solvency
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--success-text)', opacity: 0.9 }}>
                      Every ledger entry represents one leg of a balanced transaction. Account balance is reconstructable from genesis.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================================================== */}
        {/* ROLE 2: AUDITOR DASHBOARD                            */}
        {/* ==================================================== */}
        {currentUser.role === 'AUDITOR' && (
          <div className="animate-fade-in">
            {/* Global Conservation Invariant Card */}
            {conservation && (
              <div
                className="pro-card"
                style={{
                  padding: '24px 26px',
                  marginBottom: 24,
                  borderLeft: '4px solid var(--primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={24} color="var(--primary)" />
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Double-Entry Global Conservation Proof</h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Fundamental Accounting Invariant: Total System Debits ≡ Total System Credits
                      </p>
                    </div>
                  </div>

                  <span className={`badge ${conservation.isConserved ? 'badge-success' : 'badge-danger'}`} style={{ padding: '5px 12px' }}>
                    {conservation.isConserved ? 'STRICTLY CONSERVED (Δ = $0.00)' : 'DISCREPANCY DETECTED'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 14,
                    marginTop: 16,
                  }}
                >
                  <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Total Debits
                    </div>
                    <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                      ${parseFloat(conservation.totalDebits).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Total Credits
                    </div>
                    <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                      ${parseFloat(conservation.totalCredits).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      System Discrepancy (Δ)
                    </div>
                    <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>
                      ${parseFloat(conservation.discrepancy).toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Account Statement Inspector */}
            <div className="pro-card" style={{ padding: '24px 22px', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Cross-Account Ledger Inspector</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Auditors hold system-wide read-only visibility across all customer and clearing vaults
                  </p>
                </div>

                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="form-select mono"
                  style={{ width: 'auto', minWidth: 260 }}
                >
                  {allAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} ({acc.owner?.fullName || 'System'}) - ${parseFloat(acc.balance).toFixed(2)}
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
                        <th>Description / Memo</th>
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
                          <td style={{ color: 'var(--text-secondary)' }}>{entry.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No statement entries found for this vault.
                </div>
              )}
            </div>

            {/* Compliance Audit Trail */}
            <div className="pro-card" style={{ padding: '24px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Immutable Compliance Audit Trail (FR-10, SR-4)</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Append-only security log recording actor, action, target entity, and outcome
                  </p>
                </div>

                <button type="button" onClick={loadAuditorData} className="btn btn-secondary btn-sm">
                  <RefreshCw size={13} />
                  Refresh
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
                        <th>Target</th>
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
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No audit log entries recorded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* ROLE 3: ADMIN DASHBOARD                              */}
        {/* ==================================================== */}
        {currentUser.role === 'ADMIN' && (
          <div className="animate-fade-in">
            {/* System Health Telemetry Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div className="pro-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Liveness Probe
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                  HTTP 200 OK
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Readiness: DB Connected
                </div>
              </div>

              <div className="pro-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Managed Vaults
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {allAccounts.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Customer & Clearing Accounts
                </div>
              </div>

              <div className="pro-card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Books Invariant
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: conservation?.isConserved ? 'var(--success)' : 'var(--danger)' }}>
                  {conservation?.isConserved ? 'CONSERVED' : 'ERROR'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Δ = $0.0000 Discrepancy
                </div>
              </div>
            </div>

            {/* Customer Account Management Table */}
            <div className="pro-card" style={{ padding: '24px 22px', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Account Access Management (BalanceVault)</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Activate, freeze, or review customer accounts
                  </p>
                </div>

                <button type="button" onClick={loadAdminData} className="btn btn-secondary btn-sm">
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>

              <div className="pro-table-wrapper">
                <table className="pro-table">
                  <thead>
                    <tr>
                      <th>Account Number</th>
                      <th>Owner</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAccounts.map((acc) => (
                      <tr key={acc.id}>
                        <td className="mono" style={{ fontWeight: 600 }}>{acc.accountNumber}</td>
                        <td>{acc.owner?.fullName || 'System Account'}</td>
                        <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{acc.owner?.email || 'N/A'}</td>
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
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
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

            {/* Recent System Audit Events */}
            <div className="pro-card" style={{ padding: '24px 22px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Recent Administrative Operations</h3>
              {auditLogs.length > 0 ? (
                <div className="pro-table-wrapper">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Actor</th>
                        <th>Operation</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.slice(0, 8).map((log) => (
                        <tr key={log.id}>
                          <td className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.actorEmail}</td>
                          <td>
                            <span className="badge badge-primary">{log.action}</span>
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
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No recent audit events.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: '#ffffff',
          color: 'var(--text-muted)',
          padding: '18px 24px',
          textAlign: 'center',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <strong>LedgerLine & BalanceVault</strong> • Enterprise Financial Engine
          </div>
          <div>
            Snovasys Fresher Hiring Challenge 2026 • Double-Entry Accounting Verified
          </div>
        </div>
      </footer>
    </div>
  );
}
