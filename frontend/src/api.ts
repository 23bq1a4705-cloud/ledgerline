import { Account, AuditLogItem, ConservationData, StatementData, User } from './types';

const envApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = envApiUrl ? `${envApiUrl}/api` : '/api';

export class ApiClient {
  private static token: string | null = localStorage.getItem('ledgerline_token');

  static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ledgerline_token', token);
    } else {
      localStorage.removeItem('ledgerline_token');
    }
  }

  static getToken() {
    return this.token;
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customHeaders: Record<string, string> = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const errMessage = data.error?.message || data.error?.code || 'Request failed';
      throw new Error(errMessage);
    }

    return data.data;
  }

  // Auth
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  static async register(payload: {
    email: string;
    password: string;
    fullName: string;
    initialDeposit?: number;
  }): Promise<{ user: User; token: string; account: Account }> {
    const res = await this.request<{ user: User; token: string; account: Account }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  static async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  static logout() {
    this.setToken(null);
  }

  // Accounts
  static async getMyAccounts(): Promise<Account[]> {
    return this.request<Account[]>('/accounts/my');
  }

  static async getAllAccounts(): Promise<{ accounts: Account[]; total: number }> {
    return this.request<{ accounts: Account[]; total: number }>('/accounts');
  }

  static async getStatement(accountId: string): Promise<StatementData> {
    return this.request<StatementData>(`/accounts/${accountId}/statement`);
  }

  static async createAccount(initialDeposit = 0): Promise<Account> {
    return this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify({ currency: 'USD', initialDeposit }),
    });
  }

  static async updateAccountStatus(accountId: string, status: 'ACTIVE' | 'FROZEN' | 'CLOSED'): Promise<Account> {
    return this.request<Account>(`/accounts/${accountId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Transactions (Requires Idempotency-Key)
  static generateIdempotencyKey(): string {
    return `idem-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  static async deposit(accountId: string, amount: number, description?: string) {
    const idempotencyKey = this.generateIdempotencyKey();
    return this.request(
      '/transactions/deposit',
      {
        method: 'POST',
        body: JSON.stringify({ accountId, amount, description }),
      },
      { 'Idempotency-Key': idempotencyKey }
    );
  }

  static async withdraw(accountId: string, amount: number, description?: string) {
    const idempotencyKey = this.generateIdempotencyKey();
    return this.request(
      '/transactions/withdraw',
      {
        method: 'POST',
        body: JSON.stringify({ accountId, amount, description }),
      },
      { 'Idempotency-Key': idempotencyKey }
    );
  }

  static async transfer(sourceAccountId: string, targetAccountNumber: string, amount: number, description?: string) {
    const idempotencyKey = this.generateIdempotencyKey();
    return this.request(
      '/transactions/transfer',
      {
        method: 'POST',
        body: JSON.stringify({ sourceAccountId, targetAccountNumber, amount, description }),
      },
      { 'Idempotency-Key': idempotencyKey }
    );
  }

  static async getConservation(): Promise<ConservationData> {
    return this.request<ConservationData>('/transactions/conservation');
  }

  // Audit
  static async getAuditLogs(): Promise<{ logs: AuditLogItem[]; total: number }> {
    return this.request<{ logs: AuditLogItem[]; total: number }>('/audit/logs');
  }

  static async getAuditSummary(): Promise<{
    totalLogs: number;
    successfulLogs: number;
    failedLogs: number;
    securityBreaches: number;
    systemIntegrity: number;
  }> {
    return this.request<any>('/audit/summary');
  }
}

