# LedgerLine & BalanceVault: Prompts & Engineering Log

*Snovasys Fresher Hiring Challenge 2026 | Engineering Decision Log*

This document tracks the prompt interactions, architectural decisions, security design choices, and verification steps taken during development.

---

### Entry 1: Architecture & Technology Stack Decision
- **Date:** 11 November 2026, 11:52 AM IST
- **Focus:** System Architecture & Runtime Stack Alignment
- **Prompt:**
  > "We have two stacks proposed in the initial write-ups: Java 21/Spring Boot vs Node.js/TypeScript/Prisma. We have 30 hours until the submission deadline (12 Nov 2026, 6:00 PM IST). Which stack allows fastest, safest implementation of concurrency protection, idempotency, automated tests, and deployment?"
- **Decision & Outcome:**
  Unified architecture selected: Node.js 24 + TypeScript + Express + Prisma (PostgreSQL / Neon) + React (Vite).
  - Why: Node v24 is already installed and verified on the host system; TypeScript provides strong static type safety; Prisma supports atomic transactions and extensions; Vitest + Supertest allows fast asynchronous concurrency testing without JVM startup overhead.
- **Reference Files:** `PRD.md`, `backend/package.json`, `backend/tsconfig.json`

---

### Entry 2: Double-Entry Ledger & Conservation Invariant Design
- **Date:** 11 November 2026, 11:58 AM IST
- **Focus:** Financial Integrity & Mathematical Conservation
- **Prompt:**
  > "Design a double-entry bookkeeping engine where every transaction writes balanced debit and credit entries. Ensure system-wide money is conserved, and account balances can be reconstructed and reconciled directly from ledger rows."
- **Decision & Outcome:**
  Implemented `LedgerService` with a `SYS-CLEARING-000000` Clearing House account:
  - Deposit: Debits System Clearing, Credits Customer Account ($\sum \text{Debit} = \sum \text{Credit}$).
  - Withdrawal: Debits Customer Account, Credits System Clearing ($\sum \text{Debit} = \sum \text{Credit}$).
  - Transfer: Debits Sender Account, Credits Receiver Account ($\sum \text{Debit} = \sum \text{Credit}$).
  - Built `verifySystemConservation()` ensuring $\sum \text{Debits} - \sum \text{Credits} = 0.00$.
  - Built `reconcileAccount(accountId)` computing $\sum \text{Credits} - \sum \text{Debits}$ and asserting equality with stored balance.
- **Reference Files:** `backend/src/services/ledger.service.ts`, `backend/src/__tests__/conservation.test.ts`

---

### Entry 3: Object-Level Authorization (SR-1) & Server-Side RBAC (FR-2)
- **Date:** 11 November 2026, 12:00 PM IST
- **Focus:** Authorization, Access Control, and IDOR Prevention
- **Prompt:**
  > "Implement strict object-level authorization (SR-1) and role-based access control (FR-2). Ensure that account holders can never view or move funds from another user's account, auditors have cross-account read-only access, and unauthorized attempts are logged to the audit trail."
- **Decision & Outcome:**
  - Created `requireRole` middleware for endpoint role boundaries.
  - Created `requireAccountOwnership` middleware for object-level validation.
  - Enforced ownership verification inside transaction controllers: an `ACCOUNT_HOLDER` attempting to withdraw or transfer from someone else's account receives HTTP 403 Forbidden and triggers a `SECURITY_OBJECT_AUTHORIZATION_BREACH_ATTEMPT` audit log.
- **Reference Files:** `backend/src/middleware/rbac.ts`, `backend/src/middleware/objectAuth.ts`, `backend/src/__tests__/authorization.test.ts`

---

### Entry 4: Concurrency Protection & Idempotent Retries
- **Date:** 11 November 2026, 12:02 PM IST
- **Focus:** Race Condition Elimination & Double-Spend Prevention
- **Prompt:**
  > "Prevent race conditions during simultaneous withdrawals (FR-9) and guarantee that repeated network requests do not charge an account twice (FR-8)."
- **Decision & Outcome:**
  - Mitigated race conditions using atomic conditional database updates (`UPDATE "Account" ... WHERE "id" = ? AND "balance" >= ? AND "status" = 'ACTIVE'`).
  - Added table-level constraint `CHECK (balance >= 0)`.
  - Built `idempotencyMiddleware` with SHA-256 payload hashing and 24-hour response caching. Repeated requests return cached response with `X-Idempotent-Replay: true`. Reusing a key with different parameters returns HTTP 409 Conflict.
- **Reference Files:** `backend/src/middleware/idempotency.ts`, `backend/src/__tests__/concurrency.test.ts`, `backend/src/__tests__/idempotency.test.ts`

---

### Entry 5: Immutable Append-Only Audit Trail (SR-4, FR-10)
- **Date:** 11 November 2026, 12:03 PM IST
- **Focus:** Audit Logging & Tamper-Proof History
- **Prompt:**
  > "Design an append-only audit trail and ledger history where application code or attackers cannot alter past records, satisfying SR-4."
- **Decision & Outcome:**
  - Designed `AuditLog` and `LedgerEntry` models without `updatedAt` timestamps.
  - Added Prisma query extensions that intercept `update`, `updateMany`, `delete`, and `deleteMany` operations on these models and throw immediate `SECURITY VIOLATION` exceptions.
  - Built `AuditService.log` to capture actor, role, action, target, outcome, IP address, and metadata.
- **Reference Files:** `backend/src/db/prisma.ts`, `backend/src/services/audit.service.ts`, `backend/src/__tests__/audit.test.ts`

