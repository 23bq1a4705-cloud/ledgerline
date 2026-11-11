import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting LedgerLine & BalanceVault Database Seeding ---');

  // 1. Create System Clearing House Account
  const clearingAccountNumber = 'SYS-CLEARING-000000';
  let clearingUser = await prisma.user.findFirst({
    where: { email: 'system@ledgerline.internal' },
  });

  if (!clearingUser) {
    clearingUser = await prisma.user.create({
      data: {
        email: 'system@ledgerline.internal',
        fullName: 'System Clearing House',
        passwordHash: 'DISABLED_AUTHENTICATION_SYSTEM_USER',
        role: 'ADMIN',
      },
    });
  }

  let clearingAccount = await prisma.account.findUnique({
    where: { accountNumber: clearingAccountNumber },
  });

  if (!clearingAccount) {
    clearingAccount = await prisma.account.create({
      data: {
        accountNumber: clearingAccountNumber,
        userId: clearingUser.id,
        balance: new Decimal('1000000000.00'),
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    console.log(`System Clearing Account created: ${clearingAccount.accountNumber}`);
  }

  // 2. Bootstrap First Admin (SR-9)
  const adminEmail = 'admin@ledgerline.internal';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AdminSecureVault2026!', salt);

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Security Administrator',
        passwordHash: hash,
        role: 'ADMIN',
      },
    });
    console.log(`Admin user bootstrapped: ${admin.email}`);

    // Audit the admin bootstrap
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: 'BOOTSTRAP_FIRST_ADMIN',
        targetType: 'SYSTEM',
        outcome: 'SUCCESS',
        details: JSON.stringify({ description: 'One-time initial administrator bootstrap completed' }),
      },
    });
  }

  // 3. Seed Auditor
  const auditorEmail = 'auditor@ledgerline.internal';
  let auditor = await prisma.user.findUnique({ where: { email: auditorEmail } });
  if (!auditor) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AuditorPass2026!', salt);

    auditor = await prisma.user.create({
      data: {
        email: auditorEmail,
        fullName: 'Independent Financial Auditor',
        passwordHash: hash,
        role: 'AUDITOR',
      },
    });
    console.log(`Auditor user seeded: ${auditor.email}`);
  }

  // Helper function to seed customer account with balanced ledger entry
  async function seedCustomer(
    email: string,
    fullName: string,
    pass: string,
    accountNumber: string,
    initialBalance: number
  ) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(pass, salt);

      user = await prisma.user.create({
        data: {
          email,
          fullName,
          passwordHash: hash,
          role: 'ACCOUNT_HOLDER',
        },
      });
      console.log(`Customer seeded: ${user.email}`);
    }

    let account = await prisma.account.findUnique({ where: { accountNumber } });
    if (!account) {
      const balanceDec = new Decimal(initialBalance);

      account = await prisma.account.create({
        data: {
          accountNumber,
          userId: user.id,
          balance: balanceDec,
          currency: 'USD',
          status: 'ACTIVE',
        },
      });

      // Update clearing account
      await prisma.account.update({
        where: { id: clearingAccount!.id },
        data: { balance: { decrement: balanceDec } },
      });

      // Write transaction
      const tx = await prisma.transaction.create({
        data: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: balanceDec,
          currency: 'USD',
          sourceAccountId: clearingAccount!.id,
          targetAccountId: account.id,
          description: `Initial verified balance for ${fullName}`,
        },
      });

      // Write balanced double-entry ledger rows
      await prisma.ledgerEntry.createMany({
        data: [
          {
            transactionId: tx.id,
            accountId: clearingAccount!.id,
            direction: 'DEBIT',
            amount: balanceDec,
            balanceAfter: new Decimal('1000000000.00').minus(balanceDec),
            description: `System contra debit for initial deposit of ${accountNumber}`,
          },
          {
            transactionId: tx.id,
            accountId: account.id,
            direction: 'CREDIT',
            amount: balanceDec,
            balanceAfter: balanceDec,
            description: `Initial account credit`,
          },
        ],
      });

      console.log(`Account seeded: ${account.accountNumber} with $${initialBalance}`);
    }
  }

  // 4. Seed Alice ($1,000.00)
  await seedCustomer(
    'alice@ledgerline.internal',
    'Alice Henderson',
    'AlicePass2026!',
    'ACC-1000000001',
    1000.0
  );

  // 5. Seed Bob ($500.00)
  await seedCustomer(
    'bob@ledgerline.internal',
    'Bob Martinez',
    'BobPass2026!',
    'ACC-1000000002',
    500.0
  );

  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

