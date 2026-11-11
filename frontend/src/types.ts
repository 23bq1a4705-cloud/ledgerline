export type Role = 'ACCOUNT_HOLDER' | 'AUDITOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Account {
  id: string;
  accountNumber: string;
  balance: string;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  createdAt: string;
  owner?: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface LedgerEntry {
  id: string;
  referenceId: string;
  type: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  balanceAfter: string;
  description: string;
  timestamp: string;
}

export interface StatementData {
  account: Account;
  statementPeriod: {
    startDate: string;
    endDate: string;
  };
  reconciliation: {
    storedBalance: string;
    derivedBalance: string;
    isReconciled: boolean;
    totalCredits: string;
    totalDebits: string;
  };
  entries: LedgerEntry[];
}

export interface AuditLogItem {
  id: string;
  actorEmail: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface ConservationData {
  isConserved: boolean;
  totalDebits: string;
  totalCredits: string;
  discrepancy: string;
  timestamp: string;
}

