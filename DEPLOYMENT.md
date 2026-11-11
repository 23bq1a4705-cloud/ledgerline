# LedgerLine & BalanceVault — Cloud Deployment Guide
## Vercel (Frontend) + Render (Backend) + Neon (PostgreSQL Database)

This guide walks you through deploying the complete LedgerLine BalanceVault application to production using **Neon** for serverless PostgreSQL, **Render** for the Express backend API, and **Vercel** for the React + Vite frontend.

---

### Architecture Overview

```
                                  +-----------------------+
                                  |   Vercel (Frontend)   |
                                  | React + Vite Dual UI  |
                                  +-----------+-----------+
                                              |
                             HTTPS / JSON REST API Requests
                             (with Idempotency-Key & JWT)
                                              |
                                              v
                                  +-----------+-----------+
                                  |   Render (Backend)    |
                                  | Express + Prisma Engine|
                                  +-----------+-----------+
                                              |
                                    Prisma ORM (Pooled)
                                              |
                                              v
                                  +-----------+-----------+
                                  |   Neon (PostgreSQL)   |
                                  | Double-Entry Database |
                                  +-----------------------+
```

---

## Step 1: Set Up the Database on Neon

1. Navigate to [**neon.tech**](https://neon.tech) and sign up or sign in.
2. Click **New Project**:
   - **Project Name:** `ledgerline`
   - **Database Name:** `neondb` (default)
   - **Region:** Choose the region closest to you or Render (e.g. `US East (Ohio)` or `US East (N. Virginia)`).
3. Under **Dashboard > Connection Details**, select **Prisma** or **PostgreSQL**:
   - Check the **Pooled connection** checkbox (recommended for serverless/cloud workloads).
   - Copy the connection string. It will look like:
     ```text
     postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Keep this connection string ready for Step 2.

---

## Step 2: Deploy the Backend on Render

You can deploy using Render's automatic **Blueprint** (recommended) or as a manual **Web Service**.

### Option A: 1-Click Render Blueprint (Recommended)

1. Sign in to [**render.com**](https://render.com).
2. Go to **Blueprints > New Blueprint Instance**.
3. Select your linked GitHub repository: `https://github.com/23bq1a4705-cloud/ledgerline`.
4. Render will detect the included `render.yaml` automatically.
5. In the configuration prompt, provide your Neon connection string for:
   - `DATABASE_URL`: Paste your Neon connection string from Step 1.
6. Click **Apply**.
7. Render will automatically:
   - Install dependencies.
   - Run `prepare-db.js` (detects PostgreSQL from Neon and configures Prisma).
   - Push database schema to Neon (`npx prisma db push`).
   - Run the initial seed script (`npx tsx prisma/seed.ts`), provisioning Alice ($1,000), Bob ($500), Auditor, and Admin.
   - Start the Express server on port `10000`.
8. Once the build finishes, copy your live backend URL (e.g., `https://ledgerline-backend.onrender.com`).
9. Verify health probes by visiting:
   - `https://ledgerline-backend.onrender.com/health` (should return `{"status":"UP"}`)
   - `https://ledgerline-backend.onrender.com/readiness` (should return `{"status":"READY","database":"CONNECTED"}`)

### Option B: Manual Web Service Setup on Render

1. On Render Dashboard, click **New + > Web Service**.
2. Connect your repository: `https://github.com/23bq1a4705-cloud/ledgerline`.
3. Configure the service settings:
   - **Name:** `ledgerline-backend`
   - **Region:** Same region as Neon (e.g. `US East` / `Oregon`)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && node ./scripts/prepare-db.js && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts && npm run build
     ```
   - **Start Command:**
     ```bash
     npm run start
     ```
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: `postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - `JWT_SECRET`: Generate a secure 32+ character string (or use `render-jwt-secure-secret-2026-production`)
   - `JWT_EXPIRES_IN`: `24h`
   - `CLIENT_URL`: `*` (or your Vercel URL once deployed)
   - `INITIAL_ADMIN_EMAIL`: `admin@ledgerline.internal`
   - `INITIAL_ADMIN_PASSWORD`: `AdminSecureVault2026!`
   - `INITIAL_ADMIN_NAME`: `System Administrator`
   - `SYSTEM_CLEARING_ACCOUNT_NUMBER`: `SYS-CLEARING-000000`
5. Click **Create Web Service**.

---

## Step 3: Deploy the Frontend on Vercel

1. Navigate to [**vercel.com**](https://vercel.com) and sign in.
2. Click **Add New... > Project**.
3. Select your linked GitHub repository: `https://github.com/23bq1a4705-cloud/ledgerline`.
4. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select **`frontend`**
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
5. Expand the **Environment Variables** section and add:
   - **Key:** `VITE_API_URL`
   - **Value:** Your Render backend URL from Step 2 (e.g., `https://ledgerline-backend.onrender.com`)
     *(Do not include trailing slash)*
6. Click **Deploy**.
7. In ~30 seconds, Vercel will deploy the frontend and provide your production domain (e.g., `https://ledgerline-frontend.vercel.app`).

---

## Step 4: Verification & Live Evaluation

Open your live Vercel URL in your browser:

1. **Authentication & Theme Switching**:
   - Check the **Theme Switcher** (top-right of login page): toggle between **Soft Precision Light** and **Midnight Precision Dark**.
2. **Customer Persona (Alice)**:
   - Click the **Alice ($1,000)** 1-Click evaluator button.
   - Click **Transfer** $\to$ send `$150.00` to Bob (`ACC-1000000002`).
   - Notice Alice's balance drops to `$850.00` and the transaction appears instantly in Recent Ledger Activity.
3. **Recipient Persona (Bob)**:
   - Sign out $\to$ Click the **Bob ($500)** evaluator button.
   - Open **Incoming Streams**: Bob's balance reflects `$650.00` with the received credit logged.
4. **Compliance Auditor**:
   - Sign out $\to$ Click **Auditor**.
   - Verify the **Global Conservation Invariant Proof**:
     $$\sum \text{Debits} \equiv \sum \text{Credits} \quad (\Delta = \$0.0000)$$
   - Inspect the Cross-Vault Statement and Compliance Audit Trail.
5. **Administrator**:
   - Sign out $\to$ Click **Admin**.
   - Review Health Telemetry (`/health` and `/readiness`).
   - Toggle **Freeze Vault** / **Activate Vault** on any customer account.

