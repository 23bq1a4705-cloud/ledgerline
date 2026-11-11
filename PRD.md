# LedgerLine / BalanceVault: Product Requirements Document

*Snovasys Fresher Hiring Challenge 2026 | Draft v0.1 | 11 November 2026*

> **Honesty note.** This PRD describes what the product should do. Status columns say what is and is not built, based only on the two write-ups provided. Anything marked "Not started" or "Unverified" must not be described as working in the README, the submission form, or the demo.

## 1. Overview

**LedgerLine** is a money-movement system where the books always balance and the same request never pays twice. **BalanceVault** is the account-management extension: role-based access, user onboarding, and auditable account operations.

Both run on synthetic data. This is a hackathon demonstration, not a production financial service, and it never handles real funds.

## 2. Problem Statement

Unsafe money movement in financial applications causes losses. The main failure modes are:

- Duplicate requests that pay twice.
- Simultaneous withdrawals that overdraw an account.
- Unauthorised transactions and access to other people's accounts.
- Incorrect balances that cannot be traced or proven.

Managing accounts also needs controlled access, secure authentication, clear onboarding, and accountability for every important action.

## 3. Goals and Non-Goals

### Goals

1. Every transaction is **accurate** (money is conserved), **authorised** (caller is allowed), **traceable** (audit trail), and **recorded** (double-entry ledger).
2. A retried request returns the original result instead of executing twice.
3. Concurrent requests can never push a balance below zero.
4. Account holders see only their own data. Auditors can read but not change. Admins manage users but cannot rewrite history.
5. A judge attacking the deployed system finds no unauthorised path to data or funds.

### Non-Goals

- Real payments, banking integrations, KYC, or real customer data.
- Multi-currency, interest, fees, or scheduled payments.
- Production-grade monitoring and high availability.

## 4. Users and Roles

| Role | Can do | Cannot do |
| --- | --- | --- |
| **Account holder** | Register, view own accounts and balance, deposit, withdraw, transfer from own account, view own statements | See or act on any other user's account |
| **Auditor** | Read ledger, audit log and statements across accounts | Create, change, or delete anything |
| **Administrator** | Onboard and manage users, open accounts, read audit log | Edit or delete ledger or audit entries, move money outside normal rules |

## 5. Functional Requirements

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| FR-1 | Authentication (login, session or token, logout) | Must | Started (Spring Security configured in the LedgerLine setup; BalanceVault write-up says implemented, unverified end to end) |
| FR-2 | Role-based authorisation for admin, account holder, auditor, enforced on the server for every endpoint | Must | Not complete |
| FR-3 | Account-holder registration and account onboarding workflow | Must | Implemented per BalanceVault write-up, end-to-end testing pending |
| FR-4 | Account creation and balance management | Must | Not started (LedgerLine) |
| FR-5 | Deposit, withdrawal, and transfer between accounts | Must | Not started |
| FR-6 | Double-entry ledger: every transaction writes balanced debit and credit entries, and balances are derived from or reconciled against them | Must | Not started |
| FR-7 | Server-side prevention of negative balances | Must | Not started |
| FR-8 | Idempotency: each money-moving request carries a key, and a repeat returns the stored original result | Must | Not started |
| FR-9 | Concurrency protection: simultaneous withdrawals cannot overdraw (row locks or serialisable transactions, plus a database constraint) | Must | Not started |
| FR-10 | Append-only audit trail of important actions (who, what, when, outcome) | Must | Designed per BalanceVault write-up, live verification pending |
| FR-11 | Account statements and ledger views by account and date range | Should | Not started |
| FR-12 | Admin user management and audit-log access through the interface | Should | Designed, unverified |
| FR-13 | Rate limiting on the backend | Should | Redis integration reported, unverified |
| FR-14 | Health and readiness endpoints | Should | Health endpoint done; readiness reported in BalanceVault |
| FR-15 | React dashboard integrated with the API | Should | Not complete |

## 6. Security Requirements

Security carries the most marks (35 of 100), so these are first-class requirements.

- **SR-1 Object-level authorisation.** Every account, ledger, and statement request checks that the caller owns the resource or holds an allowed role. Test with another user's account ID.
- **SR-2 No trust in the client.** Amounts, account IDs, and roles are validated on the server. Reject negative, zero, non-numeric, and overflowing amounts.
- **SR-3 Money integrity in the database.** Use `CHECK (balance >= 0)` or equivalent, foreign keys, and a unique constraint on idempotency keys. Never change balances with an unguarded read-then-write.
- **SR-4 Append-only history.** The application's database role has no `UPDATE` or `DELETE` on the ledger and audit tables.
- **SR-5 Separate database roles** for migration, application runtime, and admin bootstrap, with least privilege (already part of the BalanceVault design).
- **SR-6 Secrets handling.** No passwords or keys in the repository. Use environment variables, ignore `.env`, and check history with `git log -p`.
- **SR-7 Authentication hardening.** Hashed passwords, brute-force rate limiting, and no user enumeration in error messages.
- **SR-8 Safe errors.** No stack traces or internals returned to clients.
- **SR-9 First-admin bootstrap** is a controlled, one-time, documented process.

## 7. Non-Functional Requirements

- **Correctness:** conservation of money holds after any sequence of operations, including concurrent and repeated ones.
- **Reliability:** the live link opens in a private window on another device.
- **Maintainability:** readable structure, consistent error handling, small meaningful commits.
- **Explainability:** the author can walk through and modify the authorisation logic live.

## 8. Technical Approach

Two stacks appear in the supplied write-ups. **Confirm which one is the real project before building further.**

| Area | LedgerLine write-up | BalanceVault write-up |
| --- | --- | --- |
| Backend | Java 21, Spring Boot, Maven | Node.js |
| Frontend | React and Vite | React (deployed) |
| Database | PostgreSQL, Flyway | PostgreSQL on Neon, Prisma migrations |
| Other | Spring Security | Redis rate limiting |

Whatever the stack, the core data model is:

- `users` (id, email, password hash, role)
- `accounts` (id, owner, status, balance, version)
- `ledger_entries` (id, transaction id, account, direction, amount, created at), append-only
- `transactions` (id, type, idempotency key, status, created at)
- `idempotency_keys` (key, user, request hash, stored response), unique
- `audit_log` (id, actor, action, target, outcome, created at), append-only

## 9. Testing Requirements

Automated tests are worth marks and back up `THREATS.md`.

1. **Concurrency:** many parallel withdrawals leave the balance at or above zero.
2. **Idempotency:** the same key sent repeatedly changes balances once.
3. **Conservation:** total debits equal total credits after every scenario.
4. **Authorisation:** account holder A cannot read or move money from account B. Auditor cannot write. Admin cannot edit history.
5. **Validation:** bad amounts and malformed input are rejected.
6. **Audit:** each money-moving or admin action produces an audit row.

## 10. Deliverables

- Private GitHub repository with a real commit history (confirm public/private rule with the placement cell).
- Live deployment with seed accounts for judges.
- `README.md` that describes only what works.
- `PROMPTS.md` with at least five dated entries, at least two on authorisation, access control, or audit, each with a commit link.
- `THREATS.md` with threats, mitigations, and the tests that cover them.
- API documentation and a short demo video.
- Completed submission form, with the final box ticked before **Thursday 12 November 2026, 6:00 PM IST**.

## 11. Milestones (remaining time)

| When | Milestone |
| --- | --- |
| 11 Nov | Settle stack, schema, roles, auth. First deploy |
| 12 Nov morning | Deposit, withdraw, transfer in one transaction, with idempotency and concurrency protection |
| 12 Nov midday | Audit trail, core tests, `THREATS.md`, `PROMPTS.md` |
| 12 Nov 3 PM | Freeze features. Test the live link in a private window on another device |
| 12 Nov before 6 PM | Final README, honest "not finished" list, submit the form |

Time is very tight, so cut scope before cutting security. Ship a smaller system that is locked down.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Very little time left | Prioritise FR-5 to FR-10 and the tests. Drop dashboard polish |
| Two inconsistent stacks | Pick one today and document it |
| Claiming unverified features | Keep status columns honest. Verify on the live deployment |
| Secrets leaked in git history | Scan history and rotate any exposed password |
| Cannot explain the code live | Write or fully understand every authorisation line |
| Deadline or repo-visibility confusion | Ask the placement cell today |

## 13. Open Questions

1. Which stack is the actual project: Spring Boot or Node and Prisma?
2. Is BalanceVault a separate project or the extension layer of LedgerLine?
3. Should the repository be public or private for judging, and how will judges access it?
4. Which GitHub account is yours, and is `sivaLingaiah` that account?
5. What are the ten official functional requirements on the problem page? Map them to the table in section 5.

