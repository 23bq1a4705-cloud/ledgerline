import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, NotFoundError } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { HealthController } from './controllers/health.controller.js';

export function createApp() {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    })
  );

  // Request Body Parsers (with size limits to prevent DoS)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global Rate Limiting
  app.use('/api', apiRateLimiter);

  // Direct Health Probes (FR-14)
  app.get('/health', HealthController.getLiveness);
  app.get('/readiness', HealthController.getReadiness);

  // Main API Router
  app.use('/api', routes);

  // Catch 404
  app.use((_req, _res, next) => {
    next(new NotFoundError('API Route'));
  });

  // Global Centralized Error Handler (SR-8: Safe errors)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;

