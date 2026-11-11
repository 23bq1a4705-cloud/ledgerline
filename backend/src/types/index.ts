import { Request } from 'express';

export type Role = 'ACCOUNT_HOLDER' | 'AUDITOR' | 'ADMIN';
export const Role = {
  ACCOUNT_HOLDER: 'ACCOUNT_HOLDER' as const,
  AUDITOR: 'AUDITOR' as const,
  ADMIN: 'ADMIN' as const,
};

export type AccountStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';
export const AccountStatus = {
  ACTIVE: 'ACTIVE' as const,
  FROZEN: 'FROZEN' as const,
  CLOSED: 'CLOSED' as const,
};

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
export const TransactionType = {
  DEPOSIT: 'DEPOSIT' as const,
  WITHDRAWAL: 'WITHDRAWAL' as const,
  TRANSFER: 'TRANSFER' as const,
};

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export const TransactionStatus = {
  PENDING: 'PENDING' as const,
  COMPLETED: 'COMPLETED' as const,
  FAILED: 'FAILED' as const,
};

export type LedgerDirection = 'DEBIT' | 'CREDIT';
export const LedgerDirection = {
  DEBIT: 'DEBIT' as const,
  CREDIT: 'CREDIT' as const,
};

export type AuditOutcome = 'SUCCESS' | 'FAILURE';
export const AuditOutcome = {
  SUCCESS: 'SUCCESS' as const,
  FAILURE: 'FAILURE' as const,
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  idempotencyKey?: string;
  clientIp?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}
