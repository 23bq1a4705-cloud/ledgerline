# LedgerLine & BalanceVault

**Enterprise Double-Entry Money Movement Engine & Account Management Platform**  
*Snovasys Fresher Hiring Challenge 2026 Submission*

[![Security: Hardened](https://img.shields.io/badge/Security-SR--1%20to%20SR--9%20Compliant-success)](#security-architecture)
[![Ledger: Double--Entry](https://img.shields.io/badge/Ledger-Conserved%20(%CE%A3Debit%20%3D%20%CE%A3Credit)-blue)](#double-entry-accounting-engine)
[![Tests: Automated](https://img.shields.io/badge/Tests-Concurrency%20%7C%20Idempotency%20%7C%20Conservation-emerald)](#automated-testing-suite)

---

## 1. System Overview

**LedgerLine** is a double-entry money movement engine where the books always balance ($\sum \text{Debits} \equiv \sum \text{Credits}$) and repeated network requests never execute twice.  
**BalanceVault** is the account management, role-based authorization (RBAC), and compliance extension: user onboarding, object-level access controls, and an immutable append-only audit trail.

Both systems operate with full synthetic test data designed for evaluation by the Snovasys hiring panel.

---

## 2. Judge Evaluation: Seed Accounts (1-Click Demo)

The system is seeded with dedicated evaluation accounts covering all required user personas:

| Role | Email | Password | Initial Balance | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Account Holder (Alice)** | `alice@ledgerline.internal` | `AlicePass2026!` | **$1,000.00** | Primary customer account. Test deposits, withdrawals, and transfers to Bob. |
| **Account Holder (Bob)** | `bob@ledgerline.internal` | `BobPass2026!` | **$500.00** | Secondary customer account. Recipient of cross-account transfers. |
| **Auditor** | `auditor@ledgerline.internal` | `AuditorPass2026!` | N/A (Read-Only) | Inspect global mathematical conservation ($\Delta = \$0.00$) and query audit trails. |
| **Administrator** | `admin@ledgerline.internal` | `AdminSecureVault2026!` | N/A | Manage customer accounts, freeze/activate accounts, and inspect system health. |

*Quick-Login buttons are available directly on the web application login screen for immediate one-click testing.*

---

## 3. Implemented Functional Requirements

| ID | Requirement | Implementation Details | Verified Status |
| :--- | :--- | :--- | :--- |
| **FR-1** | Authentication | JWT authentication, Bcrypt password hashing (10 rounds), token expiration, logout audit. | **Built & Verified** |
| **FR-2** | Server-Side RBAC | `requireRole` middleware enforcing `ACCOUNT_HOLDER`, `AUDITOR`, and `ADMIN` boundaries on all endpoints. | **Built & Verified** |
| **FR-3** | Registration & Onboarding | User registration automatically provisions a primary checking account with optional initial funding. | **Built & Verified** |
| **FR-4** | Account Creation & Balance | Unique cryptographic account numbers (`ACC-...`), status lifecycle (`ACTIVE`, `FROZEN`, `CLOSED`). | **Built & Verified** |
| **FR-5** | Deposits, Withdrawals, Transfers | Complete ACID transactional money movement between customer accounts and System Clearing House. | **Built & Verified** |
| **FR-6** | Double-Entry Bookkeeping | Every transaction generates balanced `DEBIT` and `CREDIT` entries. Balances reconcile from ledger entries. | **Built & Verified** |
| **FR-7** | Negative Balance Prevention | Server-side and database-level constraints guarantee that accounts can never drop below $0.00. | **Built & Verified** |
| **FR-8** | Idempotency Protection | `Idempotency-Key` header with SHA-256 payload hashing. Retries return stored original responses. | **Built & Verified** |
| **FR-9** | Concurrency Protection | Atomic conditional updates (`WHERE balance >= amount`) eliminate TOCTOU race condition overdrafts. | **Built & Verified** |
| **FR-10** | Append-Only Audit Trail | `AuditLog` captures actor, action, target, outcome, IP, and metadata. Mutating/deleting is blocked. | **Built & Verified** |
| **FR-11** | Statements & Ledger Views | Detailed account statements with live mathematical reconciliation between stored and derived balance. | **Built & Verified** |
| **FR-12** | Admin Account Management | Admin dashboard with account status toggles (Freeze/Activate) and audit search. | **Built & Verified** |
| **FR-13** | Backend Rate Limiting | Sliding-window IP rate limiting (`authRateLimiter` on auth routes, `apiRateLimiter` on API). | **Built & Verified** |
| **FR-14** | Health & Readiness Endpoints | `/health` (liveness probe) and `/readiness` (database connectivity probe). | **Built & Verified** |
| **FR-15** | Modern React Dashboard | React + TypeScript + Vite banking interface with role-tailored views and live reconciliation indicators. | **Built & Verified** |

---

## 4. Security Architecture (35% Evaluation Marks)

- **SR-1 Object-Level Authorization:** `requireAccountOwnership` middleware verifies that the caller owns the targeted account before allowing any balance operation or statement retrieval. Unauthorized access returns `403 Forbidden` and logs a security violation.
- **SR-2 Zero Client Trust:** All amounts, account IDs, and roles are strictly parsed by server-side Zod schemas. Negative numbers, zero amounts, non-numeric values, and precision beyond 2 decimal places are rejected.
- **SR-3 Database Integrity:** Atomic conditional SQL updates eliminate race conditions. Idempotency keys carry unique constraints.
- **SR-4 Append-Only History:** Application-layer Prisma extensions intercept and reject all `update`, `updateMany`, `delete`, and `deleteMany` operations on `LedgerEntry` and `AuditLog` with immediate `SECURITY VIOLATION` exceptions.
- **SR-6 Secrets Isolation:** Environment variables handled via `.env` (excluded by `.gitignore`). Default placeholders provided in `.env.example`.
- **SR-7 Authentication Hardening:** Bcrypt hashing (10 salt rounds), brute-force IP rate limiting, and uniform error messages to prevent user enumeration.
- **SR-8 Sanitized Error Handling:** Centralized error handler prevents leakage of SQL queries, database structures, or internal stack traces to clients.
- **SR-9 Controlled First-Admin Bootstrap:** Secure, documented one-time admin bootstrap script (`backend/prisma/seed.ts`) recorded in the audit log.

---

## 5. Automated Testing Suite

The repository includes a comprehensive automated test suite in `backend/src/__tests__/`:

```bash
cd backend
npm test
```

1. **Concurrency Protection (`concurrency.test.ts`):**  
   Fires 10 simultaneous $100 withdrawals against a $150 balance. Exactly 1 transaction succeeds; 9 fail with `422 INSUFFICIENT_FUNDS`. Final balance is strictly $50.00.
2. **Idempotency (`idempotency.test.ts`):**  
   Repeats the identical transaction 5 times with the same key. Account is charged once; 4 retries return cached responses with `X-Idempotent-Replay: true`. Tampering with payload parameters returns `409 CONFLICT`.
3. **Double-Entry Conservation (`conservation.test.ts`):**  
   Executes a sequence of deposits, transfers, and withdrawals across multiple accounts. Verifies global $\sum \text{Debits} - \sum \text{Credits} \equiv 0.00$ and reconciles each account's stored balance against its ledger entries.
4. **Authorization & IDOR (`authorization.test.ts`):**  
   Proves Account Holder A cannot withdraw from or inspect Account Holder B's account (403 Forbidden). Proves Auditor cannot write. Proves ledger entries cannot be updated or deleted.
5. **Input Validation (`validation.test.ts`):**  
   Rejects negative deposits, zero amounts, strings, sub-cent rounding fractions, and missing idempotency headers.
6. **Audit Trail Compliance (`audit.test.ts`):**  
   Verifies that financial actions generate immutable audit log records with actor identity, action type, and outcome.

---

## 6. Getting Started & Running Locally

### Prerequisites
- Node.js (v20+ or v24)
- npm (v10+ or v11)
- PostgreSQL (or Neon connection string)

### Step 1: Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL / Neon DATABASE_URL
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```
*Backend runs on `http://localhost:4000`*

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 7. Submission Artifacts

- **Deployment Guide (Vercel + Render + Neon):** [`DEPLOYMENT.md`](file:///D:/Ledgerline/DEPLOYMENT.md)
- **Threat Model:** [`THREATS.md`](file:///D:/Ledgerline/THREATS.md)
- **Engineering Prompts & Log:** [`PROMPTS.md`](file:///D:/Ledgerline/PROMPTS.md)
- **API Documentation:** [`API.md`](file:///D:/Ledgerline/API.md)
- **Product Requirements Document:** [`PRD.md`](file:///D:/Ledgerline/PRD.md)

