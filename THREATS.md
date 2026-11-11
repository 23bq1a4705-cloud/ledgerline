# LedgerLine & BalanceVault: Threat Model & Security Mitigations

*Snovasys Fresher Hiring Challenge 2026 | Security & Resilience Specification*

This threat model outlines the attack vectors considered in the design of LedgerLine & BalanceVault, their specific technical mitigations, and the automated tests that verify each mitigation.

---

## Threat Matrix

| Threat ID | Threat Name | Impact | Technical Mitigation | Automated Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **THREAT-01** | Concurrent Withdrawal Overdraft (Race Condition) | Critical | Atomic conditional update (`WHERE id = ? AND balance >= ?`) + Database constraint `CHECK (balance >= 0)`. | `backend/src/__tests__/concurrency.test.ts` |
| **THREAT-02** | Duplicate Transaction Replay (Network Retry Double-Spend) | High | Mandatory `Idempotency-Key` header with request SHA-256 payload hashing and cached response replay. | `backend/src/__tests__/idempotency.test.ts` |
| **THREAT-03** | Broken Object-Level Authorization (BOLA / IDOR) | High | `requireAccountOwnership` middleware and service-level verification ensuring users only access their own accounts. | `backend/src/__tests__/authorization.test.ts` |
| **THREAT-04** | Privilege Escalation (Auditor Writing or Admin Tampering) | High | Server-side RBAC middleware (`requireRole`). Auditors have read-only permissions; Admin cannot alter historical ledger. | `backend/src/__tests__/authorization.test.ts` |
| **THREAT-05** | Ledger & Audit Trail Tampering (History Rewrite) | Critical | Append-only database design; Prisma runtime query interception throws `SECURITY VIOLATION` on any `UPDATE` or `DELETE`. | `backend/src/__tests__/authorization.test.ts` |
| **THREAT-06** | Malicious Input & Sub-Cent Rounding Attacks | Medium | Strict Zod validation; rejects negative, zero, non-numeric, or numbers with > 2 decimal places. High-precision `Decimal` math. | `backend/src/__tests__/validation.test.ts` |
| **THREAT-07** | Money Leakage / Unbalanced Books | Critical | Strict Double-Entry Bookkeeping. Every transaction pairs equal Debits and Credits with a System Clearing account. | `backend/src/__tests__/conservation.test.ts` |
| **THREAT-08** | Brute-Force Password Guessing & User Enumeration | Medium | Sliding-window IP rate limiting (`authRateLimiter`), Bcrypt hashing (10 rounds), timing-safe uniform error messages. | `backend/src/middleware/rateLimiter.ts` |
| **THREAT-09** | Stack Trace & Internal Schema Leakage | Low | Centralized error handler returning sanitized `ApiResponse` JSON without database or stack trace internals. | `backend/src/middleware/errorHandler.ts` |
| **THREAT-10** | Uncontrolled First-Admin Creation | High | Controlled, one-time bootstrap script (`backend/prisma/seed.ts`) recorded in the immutable audit trail. | `backend/prisma/seed.ts` |

---

## Detailed Threat Mitigations

### 1. Concurrent Withdrawal Overdraft (THREAT-01)
- **Vulnerability:** When multiple withdrawal requests arrive simultaneously, a standard `SELECT balance ... if (balance >= amount) UPDATE balance` suffers from a Time-of-Check to Time-of-Use (TOCTOU) race condition, resulting in negative balances.
- **Mitigation:**
  1. The database layer executes an atomic conditional update:
     ```sql
     UPDATE "Account"
     SET "balance" = "balance" - $amount, "version" = "version" + 1
     WHERE "id" = $accountId AND "balance" >= $amount AND "status" = 'ACTIVE';
     ```
  2. If another transaction has already reduced the balance, the condition `balance >= $amount` evaluates to false, updating 0 rows.
  3. The service checks `updateResult.count === 0` and immediately throws an `InsufficientFundsError`.
  4. In addition, the database table includes `CHECK (balance >= 0)`.
- **Test:** Firing 10 simultaneous $100 withdrawals against a $150 balance proves that exactly 1 succeeds and 9 fail with HTTP 422, leaving the balance strictly at $50.00.

### 2. Duplicate Transaction Replay (THREAT-02)
- **Vulnerability:** Unstable mobile connections often cause clients to retry payment requests when a network timeout occurs, causing duplicate charges.
- **Mitigation:**
  1. Every financial transaction endpoint requires an `Idempotency-Key` header.
  2. A deterministic SHA-256 hash is computed from `method + path + userId + requestBody`.
  3. If the key exists:
     - If the payload matches, the stored response is returned immediately with `X-Idempotent-Replay: true`.
     - If the payload differs, it returns `409 Conflict`.
  4. If new, the key is recorded alongside the HTTP response within the database transaction.

### 3. Broken Object-Level Authorization (THREAT-03)
- **Vulnerability:** An authenticated attacker alters the `accountId` parameter in the URL or request body to view or withdraw from another user's account.
- **Mitigation:**
  1. `requireAccountOwnership` middleware retrieves the account record and verifies `account.userId === req.user.id`.
  2. Cross-account access attempts by `ACCOUNT_HOLDER` are blocked with `403 Forbidden` and logged as `SECURITY_OBJECT_AUTHORIZATION_BREACH_ATTEMPT` in the immutable audit log.
  3. Only `AUDITOR` and `ADMIN` have read overrides.

### 4. Append-Only Ledger & Audit Trail Integrity (THREAT-05)
- **Vulnerability:** A rogue employee or compromised credential attempts to alter or delete ledger entries to conceal embezzlement.
- **Mitigation:**
  1. The `LedgerEntry` and `AuditLog` models contain no `updatedAt` field.
  2. The Prisma client is wrapped in a security extension that intercepts and blocks `update`, `updateMany`, `delete`, and `deleteMany` calls, throwing a `SECURITY VIOLATION` error.
  3. Database roles for runtime have `UPDATE` and `DELETE` revoked on ledger tables.

### 5. Money Conservation & Double-Entry Accounting (THREAT-07)
- **Vulnerability:** Asymmetric transactions where money is credited to an account without a corresponding debit elsewhere, causing ledger imbalance.
- **Mitigation:**
  1. Every money movement generates exactly balanced `DEBIT` and `CREDIT` entries.
  2. Deposits debit the System Clearing Account and credit the Customer Account.
  3. Withdrawals debit the Customer Account and credit the System Clearing Account.
  4. Transfers debit the Sender Account and credit the Receiver Account.
  5. The global invariant $\sum \text{Debits} \equiv \sum \text{Credits}$ holds at all times and is verified by `LedgerService.verifySystemConservation()`.

