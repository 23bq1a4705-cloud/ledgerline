import React, { useState } from 'react';
import { Account } from '../types';
import { X, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  initialTab?: 'transfer' | 'deposit' | 'withdraw';
  onExecute: (
    type: 'transfer' | 'deposit' | 'withdraw',
    sourceAccountId: string,
    amount: number,
    targetAccountNumber?: string,
    description?: string
  ) => Promise<void>;
  loading: boolean;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialTab = 'transfer',
  onExecute,
  loading,
}) => {
  const [tab, setTab] = useState<'transfer' | 'deposit' | 'withdraw'>(initialTab);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [targetAccountNumber, setTargetAccountNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Please enter a valid positive dollar amount.');
      return;
    }

    if (tab === 'transfer' && !targetAccountNumber.trim()) {
      setValidationError('Please specify destination account number (e.g. ACC-1000000002).');
      return;
    }

    if ((tab === 'transfer' || tab === 'withdraw') && activeAccount) {
      const balance = parseFloat(activeAccount.balance || '0');
      if (numAmount > balance) {
        setValidationError(`Insufficient funds. Available balance: $${balance.toFixed(2)}`);
        return;
      }
    }

    try {
      await onExecute(tab, selectedAccountId || activeAccount?.id, numAmount, targetAccountNumber, description);
      setAmount('');
      setDescription('');
      setTargetAccountNumber('');
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Transaction could not be settled.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tab === 'transfer' && <ArrowLeftRight size={18} />}
              {tab === 'deposit' && <ArrowDownLeft size={18} />}
              {tab === 'withdraw' && <ArrowUpRight size={18} />}
            </div>
            <div>
              <h2 className="modal-title">Initiate Money Movement</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Double-entry settlement with SHA-256 idempotency
              </p>
            </div>
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

        {/* Tab Selection */}
        <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setTab('transfer');
                setValidationError(null);
              }}
              className={`btn btn-sm ${tab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <ArrowLeftRight size={14} />
              <span>Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('deposit');
                setValidationError(null);
              }}
              className={`btn btn-sm ${tab === 'deposit' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <ArrowDownLeft size={14} />
              <span>Deposit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('withdraw');
                setValidationError(null);
              }}
              className={`btn btn-sm ${tab === 'withdraw' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <ArrowUpRight size={14} />
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {validationError && (
              <div
                className="animate-fade-in"
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger-text)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Account Selector */}
            <div className="form-group">
              <label className="form-label">
                <span>{tab === 'deposit' ? 'Receiving Vault' : 'Funding Vault'}</span>
                {activeAccount && (
                  <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Available: ${parseFloat(activeAccount.balance).toFixed(2)}
                  </span>
                )}
              </label>
              <select
                value={selectedAccountId || activeAccount?.id}
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

            {/* Target Account Number (Transfer Only) */}
            {tab === 'transfer' && (
              <div className="form-group">
                <label className="form-label">
                  <span>Destination Account Number</span>
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

            {/* Amount */}
            <div className="form-group">
              <label className="form-label">Monetary Amount (USD)</label>
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="form-input mono"
                  style={{ paddingLeft: 28, fontWeight: 700, fontSize: '1rem' }}
                />
              </div>
            </div>

            {/* Memo */}
            <div className="form-group">
              <label className="form-label">Memo / Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Invoice settlement, payroll transfer, savings reserve"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Idempotency & Security Badge */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              <ShieldCheck size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <span>Protected against duplicate billing with SHA-256 Idempotency headers.</span>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading
                ? 'Settling on Ledger...'
                : tab === 'transfer'
                ? 'Execute Transfer'
                : `Confirm ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

