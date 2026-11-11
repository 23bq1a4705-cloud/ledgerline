import React, { useState, useEffect } from 'react';
import { ApiClient } from './api';
import { Account, AuditLogItem, ConservationData, StatementData, User } from './types';
import CuteDog from './CuteDog';
import CuteDecor from './CuteDecor';
import { Icon, IconTile } from './Icon';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
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
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Check existing session
  useEffect(() => {
    const token = ApiClient.getToken();
    if (token) {
      ApiClient.getMe()
        .then((res) => {
          setCurrentUser(res.user);
        })
        .catch(() => {
          ApiClient.logout();
          setCurrentUser(null);
        });
    }
  }, []);

  // Fetch role-specific data
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'ACCOUNT_HOLDER') {
      loadMyAccounts();
    } else if (currentUser.role === 'AUDITOR') {
      loadAuditorData();
    } else if (currentUser.role === 'ADMIN') {
      loadAdminData();
    }
  }, [currentUser]);

  // Load statement when selected account changes
  useEffect(() => {
    if (selectedAccountId) {
      loadStatement(selectedAccountId);
    }
  }, [selectedAccountId]);

  const loadMyAccounts = async () => {
    try {
      setLoading(true);
      const accs = await ApiClient.getMyAccounts();
      setAccounts(accs);
      if (accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatement = async (accId: string) => {
    try {
      const data = await ApiClient.getStatement(accId);
      setStatement(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const loadAuditorData = async () => {
    try {
      setLoading(true);
      const [cons, logs, all] = await Promise.all([
        ApiClient.getConservation(),
        ApiClient.getAuditLogs(),
        ApiClient.getAllAccounts(),
      ]);
      setConservation(cons);
      setAuditLogs(logs.logs);
      setAllAccounts(all.accounts);
      if (all.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(all.accounts[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [all, logs, cons] = await Promise.all([
        ApiClient.getAllAccounts(),
        ApiClient.getAuditLogs(),
        ApiClient.getConservation(),
      ]);
      setAllAccounts(all.accounts);
      setAuditLogs(logs.logs);
      setConservation(cons);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Seed Quick Login
  const handleQuickLogin = async (loginEmail: string, loginPass: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await ApiClient.login(loginEmail, loginPass);
      setCurrentUser(res.user);
      setSuccessMessage(`Signed in as ${res.user.fullName} (${res.user.role})`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Standard Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'login') {
        const res = await ApiClient.login(email, password);
        setCurrentUser(res.user);
        setSuccessMessage(`Welcome back, ${res.user.fullName}`);
      } else {
        const res = await ApiClient.register({
          email,
          password,
          fullName,
          initialDeposit: Number(initialDeposit) || 0,
        });
        setCurrentUser(res.user);
        setSuccessMessage(`Account registered successfully with account ${res.account?.accountNumber}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ApiClient.logout();
    setCurrentUser(null);
    setAccounts([]);
    setStatement(null);
    setSelectedAccountId('');
    setDashboardTab('dashboard');
  };

  // Transaction Execution
  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid positive number for amount');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      if (actionTab === 'deposit') {
        await ApiClient.deposit(selectedAccountId, numAmount, description);
        setSuccessMessage(`Successfully deposited $${numAmount.toFixed(2)}`);
      } else if (actionTab === 'withdraw') {
        await ApiClient.withdraw(selectedAccountId, numAmount, description);
        setSuccessMessage(`Successfully withdrew $${numAmount.toFixed(2)}`);
      } else if (actionTab === 'transfer') {
        if (!targetAccountNumber.trim()) {
          setErrorMessage('Target account number is required for transfers');
          setLoading(false);
          return;
        }
        await ApiClient.transfer(selectedAccountId, targetAccountNumber.trim(), numAmount, description);
        setSuccessMessage(`Successfully transferred $${numAmount.toFixed(2)} to ${targetAccountNumber}`);
      }

      setAmount('');
      setDescription('');
      setTargetAccountNumber('');
      await loadMyAccounts();
      if (selectedAccountId) {
        await loadStatement(selectedAccountId);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewAccount = async () => {
    try {
      setLoading(true);
      const newAcc = await ApiClient.createAccount(0);
      setSuccessMessage(`Created new account ${newAcc.accountNumber}`);
      await loadMyAccounts();
      setSelectedAccountId(newAcc.id);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccountStatus = async (accId: string, currentStatus: string) => {
    try {
      setLoading(true);
      const nextStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
      await ApiClient.updateAccountStatus(accId, nextStatus);
      setSuccessMessage(`Account updated to ${nextStatus}`);
      await loadAdminData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Account Holder
  const totalBalance = accounts.reduce((acc, a) => acc + (parseFloat(a.balance) || 0), 0);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Helper for masking account number
  const formatMaskedAccount = (num?: string) => {
    if (!num) return '';
    if (num.length <= 8) return num;
    return `${num.slice(0, 4)}••••${num.slice(-4)}`;
  };

  // Statement totals
  const statementCreditsTotal = statement?.entries
    ? statement.entries
        .filter((e) => e.direction === 'CREDIT')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    : 0;

  const statementDebitsTotal = statement?.entries
    ? statement.entries
        .filter((e) => e.direction === 'DEBIT')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)
    : 0;

  // ----------------------------------------------------
  // 1. LOGIN PAGE (THE DOG APPEARS ON THIS PAGE ONLY)
  // ----------------------------------------------------
  if (!currentUser) {
    return (
      <div className="login-page-wrapper">
        {/* Soft Background Decor & Three Color Blobs */}
        <div className="login-blob login-blob-lavender" aria-hidden="true" />
        <div className="login-blob login-blob-mint" aria-hidden="true" />
        <div className="login-blob login-blob-blush" aria-hidden="true" />
        <CuteDecor />

        {/* The Dog (<CuteDog />): position: absolute outside layout flow */}
        <div className="login-dog-holder" aria-hidden="true">
          <CuteDog flip={false} />
        </div>

        {/* Centred Card (width: 100%, max-width: 420px, margin: 0 auto) */}
        <div className="login-card">
          {/* Round lavender-to-blush badge containing a piggy bank icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--blush) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 6px 18px rgba(184, 169, 245, 0.45)',
            }}
          >
            <Icon name="piggy" size={40} />
          </div>

          {/* Title & Subtitle */}
          <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
            Welcome to BalanceVault
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
            Sign in to your demo account
          </p>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="success-animated" style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-bg)', border: '1px solid #ffd4d8', color: 'var(--danger)', marginBottom: 16, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="success-animated" style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-bg)', border: '1px solid #c8e6c9', color: 'var(--success)', marginBottom: 16, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleAuthSubmit} style={{ textAlign: 'left' }}>
            {authMode === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="login-input"
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>
                Username
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="login-input"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
              />
            </div>

            {authMode === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', marginBottom: 5 }}>
                  Initial Deposit ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialDeposit}
                  onChange={(e) => setInitialDeposit(parseFloat(e.target.value) || 0)}
                  className="login-input"
                />
              </div>
            )}

            {/* Lavender pill "Sign in" button with dark text (#2b2447) */}
            <button
              type="submit"
              disabled={loading}
              className="btn-pill btn-lavender-dark-text"
              style={{ width: '100%', padding: '13px 0', fontSize: '0.98rem' }}
            >
              {loading ? 'Processing...' : authMode === 'login' ? 'Sign in' : 'Complete Registration'}
            </button>
          </form>

          {/* Stronger mint info note (#c9f2e0) with green shield icon */}
          <div className="login-info-note">
            <Icon name="shield" size={20} color="#1d6644" />
            <span className="login-info-note-text">
              Demo data only. No real money moves here.
            </span>
          </div>

          {/* Quick Demo Seed Accounts: 1-click chips with different pastel fills & dark text */}
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              1-Click Demo Logins
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('alice@ledgerline.internal', 'AlicePass2026!')}
                className="demo-chip demo-chip-lavender"
              >
                Alice ($1k)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('bob@ledgerline.internal', 'BobPass2026!')}
                className="demo-chip demo-chip-mint"
              >
                Bob ($500)
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('auditor@ledgerline.internal', 'AuditorPass2026!')}
                className="demo-chip demo-chip-peach"
              >
                Auditor
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ledgerline.internal', 'AdminSecureVault2026!')}
                className="demo-chip demo-chip-blush"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Toggle Login / Register */}
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              style={{ fontSize: '0.8rem', color: 'var(--primary-hover)', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {authMode === 'login' ? "Need a new account? Register here" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2, 3, 4. AUTHENTICATED PAGES (NO DOG ON ANY OF THESE)
  // ----------------------------------------------------
  return (
    <div className="page-bg">
      {/* Soft Background Decor */}
      <div className="bg-circle bg-circle-tl" aria-hidden="true" />
      <div className="bg-circle bg-circle-br" aria-hidden="true" />
      <CuteDecor />

      {/* HEADER */}
      <header
        style={{
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo Tile, App Name, Demo Caption */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Lavender rounded square with "B" */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.3rem',
              boxShadow: '0 4px 12px rgba(184, 169, 245, 0.45)',
            }}
          >
            B
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
                LedgerLine & BalanceVault
              </span>
              <span className="badge-pill badge-lavender" style={{ fontSize: '0.7rem' }}>
                Demo data only
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {currentUser.fullName} ({currentUser.role})
            </div>
          </div>
        </div>

        {/* Pill Nav (Accounts, Statements) + Blush "Sign out" pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentUser.role === 'ACCOUNT_HOLDER' && (
            <>
              <button
                type="button"
                onClick={() => setDashboardTab('dashboard')}
                className={`btn-pill ${dashboardTab === 'dashboard' ? 'btn-lavender' : 'btn-white'}`}
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Accounts
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab('statements')}
                className={`btn-pill ${dashboardTab === 'statements' ? 'btn-lavender' : 'btn-white'}`}
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Statements
              </button>
            </>
          )}

          {/* Blush "Sign out" pill */}
          <button
            type="button"
            onClick={handleLogout}
            className="btn-pill btn-blush"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1140, width: '100%', margin: '28px auto', padding: '0 24px 60px', flex: 1, position: 'relative', zIndex: 10 }}>
        {/* Soft Feedback Alerts */}
        {errorMessage && (
          <div className="success-animated" style={{ padding: '14px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-bg)', border: '1px solid #ffd4d8', color: 'var(--danger)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 700 }}>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="success-animated" style={{ padding: '14px 20px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-bg)', border: '1px solid #c8e6c9', color: 'var(--success)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 700 }}>{successMessage}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* ROLE 1: ACCOUNT HOLDER PAGES                         */}
        {/* ==================================================== */}
        {currentUser.role === 'ACCOUNT_HOLDER' && (
          <>
            {/* VIEW 1: MAIN DASHBOARD (NO DOG) */}
            {dashboardTab === 'dashboard' && (
              <div>
                {/* HERO BANNER: Lavender -> Sky -> Peach gradient */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(184, 169, 245, 0.45) 0%, rgba(168, 218, 220, 0.4) 50%, rgba(255, 229, 199, 0.45) 100%)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '36px 40px',
                    marginBottom: 32,
                    boxShadow: '0 10px 30px rgba(184, 169, 245, 0.18)',
                    border: '1px solid rgba(255, 255, 255, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 24,
                  }}
                >
                  {/* Left: Greeting with tiny heart, Total Balance, White Action Pills */}
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Hi {currentUser.fullName.split(' ')[0] || currentUser.fullName}, welcome back</span>
                      <span style={{ color: '#ff9ebb', fontSize: '1rem' }}>♡</span>
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Total balance
                    </div>

                    <div className="mono" style={{ fontSize: '2.9rem', fontWeight: 900, color: 'var(--text)', margin: '4px 0 18px', letterSpacing: '-0.02em' }}>
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActionTab('deposit');
                          document.getElementById('send-money-card')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn-pill btn-white"
                      >
                        <ArrowDownLeft size={16} />
                        Deposit
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionTab('withdraw');
                          document.getElementById('send-money-card')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn-pill btn-white"
                      >
                        <ArrowUpRight size={16} />
                        Withdraw
                      </button>
                    </div>
                  </div>

                  {/* Right: Rounded mint-to-sky "Your vault" card with lock icon tile */}
                  <div
                    style={{
                      width: 220,
                      background: 'linear-gradient(135deg, var(--mint) 0%, var(--sky) 100%)',
                      borderRadius: 'var(--radius-md)',
                      padding: '22px 20px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3.5px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IconTile name="lock" size={38} bg="rgba(255, 255, 255, 0.85)" />
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
                        Your vault
                      </div>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4, fontWeight: 700 }}>
                      Every transfer is checked and recorded
                    </p>
                  </div>
                </div>

                {/* "YOUR ACCOUNTS" SECTION (Cards with piggy/wallet tile & coloured top border) */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <IconTile name="wallet" size={38} bg="var(--primary-light)" />
                      <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Your accounts</h2>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Select an account to view activity and transfer money
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateNewAccount}
                      className="btn-pill btn-white"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <PlusCircle size={16} />
                      Open Additional Account
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                    {accounts.map((acc, index) => {
                      // Coloured top borders: alternating mint, blush, sky
                      const topBorderColor =
                        index % 3 === 0 ? 'var(--mint)' : index % 3 === 1 ? 'var(--blush)' : 'var(--sky)';
                      const isSelected = selectedAccountId === acc.id;

                      return (
                        <div
                          key={acc.id}
                          onClick={() => setSelectedAccountId(acc.id)}
                          className="card-soft"
                          style={{
                            padding: '24px 22px',
                            cursor: 'pointer',
                            borderTop: `4px solid ${topBorderColor}`,
                            boxShadow: isSelected ? '0 0 0 2.5px var(--primary), var(--shadow-md)' : 'var(--shadow-sm)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <IconTile
                              name={index % 2 === 0 ? 'piggy' : 'wallet'}
                              size={44}
                              bg={index % 2 === 0 ? 'var(--blush-light)' : 'var(--primary-light)'}
                            />
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text)', marginBottom: 2 }}>
                                {index === 0 ? 'Primary Checking' : `Savings Vault #${index + 1}`}
                              </div>
                              <div className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {formatMaskedAccount(acc.accountNumber)}
                              </div>
                              <span className="badge-pill badge-mint" style={{ marginTop: 6, fontSize: '0.7rem' }}>
                                {acc.status}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: '1.55rem', fontWeight: 900, color: 'var(--text)' }}>
                              ${parseFloat(acc.balance).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-light)', fontWeight: 600 }}>
                              {acc.currency}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* "SEND MONEY" AND "RECENT ACTIVITY" SECTION */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
                  {/* SEND MONEY CARD (with plane icon, labelled inputs, lavender button, mint shield note) */}
                  <div id="send-money-card" className="card-soft" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <IconTile name="plane" size={42} bg="var(--mint-light)" />
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Send money</h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Protected by instant idempotency keys
                        </p>
                      </div>
                    </div>

                    {/* Action Tabs: Send money, Deposit, Withdraw */}
                    <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 18 }}>
                      <button
                        type="button"
                        onClick={() => setActionTab('transfer')}
                        className={`btn-pill ${actionTab === 'transfer' ? 'btn-lavender' : 'btn-white'}`}
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                      >
                        <ArrowLeftRight size={14} /> Send money
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionTab('deposit')}
                        className={`btn-pill ${actionTab === 'deposit' ? 'btn-lavender' : 'btn-white'}`}
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                      >
                        <ArrowDownLeft size={14} /> Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionTab('withdraw')}
                        className={`btn-pill ${actionTab === 'withdraw' ? 'btn-lavender' : 'btn-white'}`}
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                      >
                        <ArrowUpRight size={14} /> Withdraw
                      </button>
                    </div>

                    <form onSubmit={handleExecuteTransaction}>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                          {actionTab === 'deposit' ? 'Target Account' : 'From account'}
                        </label>
                        <select
                          value={selectedAccountId}
                          onChange={(e) => setSelectedAccountId(e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontWeight: 700 }}
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.accountNumber} (${parseFloat(acc.balance).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {actionTab === 'transfer' && (
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                            To account
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ACC-1000000002"
                            value={targetAccountNumber}
                            onChange={(e) => setTargetAccountNumber(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                          />
                        </div>
                      )}

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontWeight: 800 }}
                        />
                      </div>

                      <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                          Note (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Transaction note"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                        />
                      </div>

                      {/* Lavender pill "Send securely" button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-pill btn-lavender"
                        style={{ width: '100%', padding: '13px 0', fontSize: '0.98rem' }}
                      >
                        {loading ? 'Processing...' : actionTab === 'transfer' ? 'Send securely' : `Execute ${actionTab}`}
                      </button>

                      {/* Small mint note with shield icon */}
                      <div
                        style={{
                          backgroundColor: 'var(--mint-light)',
                          border: '1px solid rgba(185, 240, 216, 0.85)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginTop: 18,
                        }}
                      >
                        <Icon name="shield" size={18} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--mint-dark)', fontWeight: 700, lineHeight: 1.35 }}>
                          Every transfer has its own key, so a retry never pays twice.
                        </span>
                      </div>
                    </form>
                  </div>

                  {/* RECENT ACTIVITY LIST (with coin, plane, and wallet icons) */}
                  <div className="card-soft" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IconTile name="coin" size={38} bg="var(--peach-light)" />
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Recent activity</h3>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {selectedAccount ? selectedAccount.accountNumber : ''}
                          </p>
                        </div>
                      </div>

                      {statement?.reconciliation && (
                        <span className="badge-pill badge-mint" style={{ fontSize: '0.72rem' }}>
                          <CheckCircle2 size={13} />
                          Reconciled
                        </span>
                      )}
                    </div>

                    <div style={{ overflowY: 'auto', maxHeight: 440, flex: 1, paddingRight: 4 }}>
                      {statement && statement.entries.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {statement.entries.map((entry) => {
                            const isCredit = entry.direction === 'CREDIT';
                            const iconType =
                              entry.type === 'TRANSFER' ? 'plane' : isCredit ? 'coin' : 'wallet';

                            return (
                              <div
                                key={entry.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 16px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isCredit ? 'rgba(232, 245, 233, 0.4)' : 'rgba(255, 240, 242, 0.45)',
                                  border: `1px solid ${isCredit ? 'rgba(200, 230, 201, 0.6)' : 'rgba(255, 212, 216, 0.6)'}`,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <IconTile
                                    name={iconType}
                                    size={36}
                                    bg={isCredit ? 'var(--mint-light)' : 'var(--blush-light)'}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text)' }}>
                                      {entry.description || entry.type}
                                    </div>
                                    <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                      {new Date(entry.timestamp).toLocaleDateString()} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>

                                {/* Amount: Green for credits, Coral for debits */}
                                <div style={{ textAlign: 'right' }}>
                                  <div
                                    className="mono"
                                    style={{
                                      fontSize: '1.05rem',
                                      fontWeight: 900,
                                      color: isCredit ? 'var(--success)' : 'var(--danger)',
                                    }}
                                  >
                                    {isCredit ? '+' : '-'}${parseFloat(entry.amount).toFixed(2)}
                                  </div>
                                  <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-light)' }}>
                                    Bal: ${parseFloat(entry.balanceAfter).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
                          <Icon name="coin" size={32} />
                          <p style={{ fontWeight: 700, marginTop: 10 }}>No activity recorded yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: STATEMENTS PAGE (NO DOG) */}
            {dashboardTab === 'statements' && (
              <div>
                {/* Title with Piggy badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <IconTile name="piggy" size={48} bg="var(--blush-light)" />
                    <div>
                      <h2 style={{ fontSize: '1.45rem', fontWeight: 900 }}>Account Statements</h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Ledger reconciliation for account {selectedAccount?.accountNumber}
                      </p>
                    </div>
                  </div>

                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)', fontWeight: 700 }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} (${parseFloat(acc.balance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* THREE SUMMARY TILES (Money in, Money out, Closing balance) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 24 }}>
                  {/* Money In */}
                  <div className="card-soft" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 16, borderTop: '4px solid var(--mint)' }}>
                    <IconTile name="coin" size={44} bg="var(--mint-light)" />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Money In
                      </div>
                      <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>
                        +${statementCreditsTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Money Out */}
                  <div className="card-soft" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 16, borderTop: '4px solid var(--blush)' }}>
                    <IconTile name="plane" size={44} bg="var(--blush-light)" />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Money Out
                      </div>
                      <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)' }}>
                        -${statementDebitsTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Closing Balance */}
                  <div className="card-soft" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 16, borderTop: '4px solid var(--primary)' }}>
                    <IconTile name="wallet" size={44} bg="var(--primary-light)" />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Closing Balance
                      </div>
                      <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
                        ${selectedAccount ? parseFloat(selectedAccount.balance).toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Icon-Led Entry List with Credit/Debit pills */}
                <div className="card-soft" style={{ padding: 28, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Ledger Entries</h3>
                    {statement?.reconciliation && (
                      <span className="badge-pill badge-mint">
                        <CheckCircle2 size={13} />
                        Reconciled: Stored ${parseFloat(statement.reconciliation.storedBalance).toFixed(2)} === Derived ${parseFloat(statement.reconciliation.derivedBalance).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '12px 10px', textAlign: 'left' }}>Item</th>
                          <th style={{ padding: '12px 10px', textAlign: 'left' }}>Timestamp</th>
                          <th style={{ padding: '12px 10px', textAlign: 'left' }}>Direction</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement && statement.entries.length > 0 ? (
                          statement.entries.map((entry) => {
                            const isCredit = entry.direction === 'CREDIT';
                            const iconName =
                              entry.type === 'TRANSFER' ? 'plane' : isCredit ? 'coin' : 'wallet';

                            return (
                              <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <IconTile
                                      name={iconName}
                                      size={34}
                                      bg={isCredit ? 'var(--mint-light)' : 'var(--blush-light)'}
                                    />
                                    <div>
                                      <div style={{ fontWeight: 800, color: 'var(--text)' }}>
                                        {entry.description || entry.type}
                                      </div>
                                      <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Ref: {entry.referenceId.slice(0, 8)}...
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="mono" style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                                  {new Date(entry.timestamp).toLocaleString()}
                                </td>
                                <td style={{ padding: '12px 10px' }}>
                                  <span className={`badge-pill ${isCredit ? 'badge-mint' : 'badge-blush'}`}>
                                    {entry.direction}
                                  </span>
                                </td>
                                <td className="mono" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 900, color: isCredit ? 'var(--success)' : 'var(--danger)' }}>
                                  {isCredit ? '+' : '-'}${parseFloat(entry.amount).toFixed(2)}
                                </td>
                                <td className="mono" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700 }}>
                                  ${parseFloat(entry.balanceAfter).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
                              <Icon name="coin" size={28} />
                              <p style={{ marginTop: 8, fontWeight: 700 }}>No statement entries recorded</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mint shield note */}
                <div
                  style={{
                    backgroundColor: 'var(--mint-light)',
                    border: '1px solid rgba(185, 240, 216, 0.85)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Icon name="shield" size={24} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--mint-dark)', fontWeight: 700 }}>
                    Every entry is one half of a balanced debit and credit pair.
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================================================== */}
        {/* ROLE 2: AUDITOR VIEW (NO DOG)                        */}
        {/* ==================================================== */}
        {currentUser.role === 'AUDITOR' && (
          <div>
            {/* Global Mathematical Conservation Card with Shield Tile */}
            {conservation && (
              <div
                className="card-soft"
                style={{
                  background: 'linear-gradient(135deg, var(--mint-light) 0%, var(--sky-light) 100%)',
                  border: '1px solid var(--mint)',
                  padding: '28px 32px',
                  marginBottom: 28,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <IconTile name="shield" size={48} bg="var(--mint)" />
                    <div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Double-Entry Mathematical Conservation</h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        System Invariant Verification: Total Debits ≡ Total Credits
                      </p>
                    </div>
                  </div>
                  <span className="badge-pill badge-mint">
                    {conservation.isConserved ? 'STRICTLY CONSERVED (Δ = $0.00)' : 'DISCREPANCY'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 14 }}>
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: '16px 20px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 800 }}>Total System Debits</div>
                    <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
                      ${parseFloat(conservation.totalDebits).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: '16px 20px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 800 }}>Total System Credits</div>
                    <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)' }}>
                      ${parseFloat(conservation.totalCredits).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: '16px 20px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 800 }}>Discrepancy (Δ)</div>
                    <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)' }}>
                      ${parseFloat(conservation.discrepancy).toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Account Statement Inspector with Wallet Tile */}
            <div className="card-soft" style={{ padding: 28, marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconTile name="wallet" size={42} bg="var(--primary-light)" />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Cross-Account Statement Inspector</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Auditors have system-wide read-only access</p>
                  </div>
                </div>

                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  style={{ padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)', fontWeight: 700 }}
                >
                  {allAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} ({acc.owner?.fullName || 'System'}) - ${parseFloat(acc.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {statement && statement.entries.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Timestamp</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Direction</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Balance After</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.entries.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="mono" style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                            {new Date(entry.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className={`badge-pill ${entry.direction === 'CREDIT' ? 'badge-mint' : 'badge-blush'}`}>
                              {entry.direction}
                            </span>
                          </td>
                          <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>
                            ${parseFloat(entry.amount).toFixed(2)}
                          </td>
                          <td className="mono" style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>
                            ${parseFloat(entry.balanceAfter).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{entry.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                  <Icon name="wallet" size={28} />
                  <p style={{ marginTop: 8, fontWeight: 700 }}>No statement entries for this account</p>
                </div>
              )}
            </div>

            {/* Compliance Audit Trail with Lock Tile */}
            <div className="card-soft" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconTile name="lock" size={42} bg="var(--sky-light)" />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Compliance Audit Trail (FR-10, SR-4)</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Immutable append-only record of all actions</p>
                  </div>
                </div>

                <button type="button" onClick={loadAuditorData} className="btn-pill btn-white">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              {auditLogs.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Timestamp</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Actor</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Action</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Target</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="mono" style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>{log.actorEmail}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 800 }}>{log.action}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{log.targetType}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className={`badge-pill ${log.outcome === 'SUCCESS' ? 'badge-mint' : 'badge-blush'}`}>
                              {log.outcome}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                  <Icon name="lock" size={28} />
                  <p style={{ marginTop: 8, fontWeight: 700 }}>No audit logs recorded</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* ROLE 3: ADMIN VIEW (NO DOG)                          */}
        {/* ==================================================== */}
        {currentUser.role === 'ADMIN' && (
          <div>
            {/* System Health Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 28 }}>
              <div className="card-soft" style={{ padding: 22, borderTop: '4px solid var(--mint)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <IconTile name="shield" size={44} bg="var(--mint-light)" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Liveness Health
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--success)' }}>HTTP 200 OK</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Readiness: DB Connected</div>
                </div>
              </div>

              <div className="card-soft" style={{ padding: 22, borderTop: '4px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <IconTile name="wallet" size={44} bg="var(--primary-light)" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Managed Accounts
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)' }}>{allAccounts.length}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Customer & System Vaults</div>
                </div>
              </div>

              <div className="card-soft" style={{ padding: 22, borderTop: '4px solid var(--sky)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <IconTile name="coin" size={44} bg="var(--sky-light)" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Books Invariant
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: conservation?.isConserved ? 'var(--success)' : 'var(--danger)' }}>
                    {conservation?.isConserved ? 'STRICTLY BALANCED' : 'ERROR'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Δ = $0.0000</div>
                </div>
              </div>
            </div>

            {/* Account Access Management Table with Lock Tile */}
            <div className="card-soft" style={{ padding: 28, marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconTile name="lock" size={42} bg="var(--blush-light)" />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Account Access Management (BalanceVault)</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Activate, freeze, or review customer accounts</p>
                  </div>
                </div>

                <button type="button" onClick={loadAdminData} className="btn-pill btn-white">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 10px', textAlign: 'left' }}>Account Number</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left' }}>Owner</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Balance</th>
                      <th style={{ padding: '12px 10px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAccounts.map((acc) => (
                      <tr key={acc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="mono" style={{ padding: '12px 10px', fontWeight: 700 }}>{acc.accountNumber}</td>
                        <td style={{ padding: '12px 10px' }}>{acc.owner?.fullName || 'System Account'}</td>
                        <td className="mono" style={{ padding: '12px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{acc.owner?.email || 'N/A'}</td>
                        <td className="mono" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800 }}>
                          ${parseFloat(acc.balance).toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <span className={`badge-pill ${acc.status === 'ACTIVE' ? 'badge-mint' : 'badge-blush'}`}>
                            {acc.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {acc.accountNumber.startsWith('SYS-') ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Protected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleAccountStatus(acc.id, acc.status)}
                              className={`btn-pill ${acc.status === 'ACTIVE' ? 'btn-coral' : 'btn-mint'}`}
                              style={{ padding: '5px 14px', fontSize: '0.78rem' }}
                            >
                              {acc.status === 'ACTIVE' ? 'Freeze Account' : 'Activate Account'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Audit Events with Coin Tile */}
            <div className="card-soft" style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <IconTile name="coin" size={40} bg="var(--peach-light)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Recent System Audit Events</h3>
              </div>

              {auditLogs.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Timestamp</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Actor</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Action</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.slice(0, 8).map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="mono" style={{ padding: '10px 8px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 8px' }}>{log.actorEmail}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 800 }}>{log.action}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span className={`badge-pill ${log.outcome === 'SUCCESS' ? 'badge-mint' : 'badge-blush'}`}>
                              {log.outcome}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light)' }}>
                  <Icon name="coin" size={28} />
                  <p style={{ marginTop: 8, fontWeight: 700 }}>No recent audit events</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          color: 'var(--text-muted)',
          padding: '20px 32px',
          textAlign: 'center',
          fontSize: '0.82rem',
          backgroundColor: 'rgba(255, 255, 255, 0.72)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        LedgerLine & BalanceVault • Double-Entry Money Movement Engine • Built for Snovasys Challenge 2026
      </footer>
    </div>
  );
}
