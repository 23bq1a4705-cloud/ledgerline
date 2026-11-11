# LedgerLine & BalanceVault: API Reference Specification

Base URL: `http://localhost:4000/api`

All financial endpoints require the `Idempotency-Key: <unique-uuid-or-string>` HTTP header.
Protected endpoints require `Authorization: Bearer <jwt-token>`.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new user. For `ACCOUNT_HOLDER`, automatically provisions a primary checking account.
- **Rate Limit:** 20 requests per 15 minutes.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "fullName": "John Doe",
    "initialDeposit": 100.00
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "fullName": "John Doe",
        "role": "ACCOUNT_HOLDER"
      },
      "account": {
        "id": "uuid",
        "accountNumber": "ACC-1234567890",
        "balance": "100.00",
        "currency": "USD"
      },
      "token": "jwt.bearer.token"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates user and returns JWT token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "user@example.com", "role": "ACCOUNT_HOLDER" },
      "token": "jwt.bearer.token"
    }
  }
  ```

### `GET /api/auth/me`
Returns current user session.

---

## 2. Accounts Endpoints (`/api/accounts`)

### `GET /api/accounts/my`
Returns all accounts owned by the authenticated caller.
- **Roles:** `ACCOUNT_HOLDER`
- **Response (200 OK):** List of user's accounts with current balance.

### `POST /api/accounts`
Opens a new account.
- **Roles:** `ACCOUNT_HOLDER`, `ADMIN`
- **Request Body:**
  ```json
  {
    "currency": "USD",
    "initialDeposit": 250.00
  }
  ```

### `GET /api/accounts`
Lists all accounts across the entire platform.
- **Roles:** `ADMIN`, `AUDITOR`

### `GET /api/accounts/:accountId/statement`
Returns detailed account statement, ledger entries, and automated ledger balance reconciliation.
- **Roles:** Account Owner, `AUDITOR`, `ADMIN`
- **Query Parameters:** `startDate`, `endDate`, `page`, `limit`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "account": { "id": "uuid", "accountNumber": "ACC-...", "balance": "1000.00" },
      "reconciliation": {
        "storedBalance": "1000.0000",
        "derivedBalance": "1000.0000",
        "isReconciled": true
      },
      "entries": [
        {
          "id": "uuid",
          "direction": "CREDIT",
          "amount": "1000.00",
          "balanceAfter": "1000.00",
          "description": "Initial account funding",
          "timestamp": "2026-11-11T12:00:00Z"
        }
      ]
    }
  }
  ```

---

## 3. Financial Transactions (`/api/transactions`)

### `POST /api/transactions/deposit`
- **Headers:** `Idempotency-Key: <unique-string>`
- **Roles:** Account Owner, `ADMIN`
- **Request Body:**
  ```json
  {
    "accountId": "uuid",
    "amount": 250.00,
    "description": "Salary deposit"
  }
  ```

### `POST /api/transactions/withdraw`
- **Headers:** `Idempotency-Key: <unique-string>`
- **Roles:** Account Owner only (SR-1)
- **Request Body:**
  ```json
  {
    "accountId": "uuid",
    "amount": 50.00,
    "description": "ATM withdrawal"
  }
  ```

### `POST /api/transactions/transfer`
- **Headers:** `Idempotency-Key: <unique-string>`
- **Roles:** Account Owner only (SR-1)
- **Request Body:**
  ```json
  {
    "sourceAccountId": "uuid",
    "targetAccountNumber": "ACC-1000000002",
    "amount": 120.00,
    "description": "Dinner split"
  }
  ```

### `GET /api/transactions/conservation`
Verifies global double-entry conservation ($\sum \text{Debits} \equiv \sum \text{Credits}$).
- **Roles:** `AUDITOR`, `ADMIN`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "isConserved": true,
      "totalDebits": "1000001400.0000",
      "totalCredits": "1000001400.0000",
      "discrepancy": "0.0000",
      "timestamp": "2026-11-11T12:00:00Z"
    }
  }
  ```

---

## 4. Audit & Compliance (`/api/audit`)

### `GET /api/audit/logs`
Paginated audit trail of all security and financial events.
- **Roles:** `AUDITOR`, `ADMIN`
- **Query Parameters:** `page`, `limit`, `action`, `outcome`, `actorEmail`

### `GET /api/audit/summary`
Returns system integrity health score and violation counts.
- **Roles:** `AUDITOR`, `ADMIN`

---

## 5. Health & Monitoring

- `GET /health` - Liveness status and uptime.
- `GET /readiness` - Database connectivity verification.

