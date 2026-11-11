import app from './app.js';
import { env } from './config/env.js';
import prisma from './db/prisma.js';

const PORT = env.PORT || 4000;

async function bootstrap() {
  try {
    // Verify DB connection
    await prisma.$connect();
    console.log('Successfully connected to database.');

    const server = app.listen(PORT, () => {
      console.log(`LedgerLine & BalanceVault Server running at http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log(`Readiness: http://localhost:${PORT}/readiness`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();

