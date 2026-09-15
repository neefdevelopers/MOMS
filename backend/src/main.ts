import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RestResponseInterceptor } from './common/interceptors/transform.interceptor';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevels: ('log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal')[] = isProduction
    ? ['log', 'warn', 'error', 'fatal'] // Production disables Debug logging
    : ['debug', 'log', 'warn', 'error', 'fatal']; // Development includes Debug

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  // Backward-compatibility & URL Normalizer:
  // Handles unversioned /api/... or direct /auth/login, /users, etc., rewriting them to /api/v1/... (excluding health and root)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawPath = req.url.split('?')[0];
    const isExcluded = rawPath === '' || rawPath === '/' || rawPath === '/health' || rawPath.startsWith('/health');
    if (!isExcluded) {
      if (req.url.startsWith('/api/v1/') || req.url.startsWith('/api/v2/')) {
        // Already versioned
      } else if (req.url.startsWith('/api/')) {
        req.url = req.url.replace('/api/', '/api/v1/');
      } else {
        // Direct un-prefixed request (e.g. /auth/login -> /api/v1/auth/login)
        req.url = `/api/v1${req.url.startsWith('/') ? '' : '/'}${req.url}`;
      }
    }
    next();
  });

  // All endpoints strictly prefixed with /api/v1 (health check & root excluded for Render diagnostics)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/health', 'api/v1/health', '', '/'],
  });

  const frontendEnv = process.env.FRONTEND_URL;
  const configuredOrigins = frontendEnv
    ? frontendEnv.split(',').map((o) => o.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl, Render health checks)
      if (!origin) return callback(null, true);

      // In non-production or if FRONTEND_URL is '*', allow all origins
      if (process.env.NODE_ENV !== 'production' || configuredOrigins.includes('*')) {
        return callback(null, true);
      }

      // Check configured origins or localhost/vercel defaults
      const defaultAllowed = ['http://localhost:3000', 'http://127.0.0.1:3000'];
      const allAllowed = [...configuredOrigins, ...defaultAllowed];

      const isAllowed = allAllowed.some((allowed) => {
        if (allowed === origin) return true;
        if (allowed.startsWith('*.')) {
          const suffix = allowed.slice(1); // e.g. .vercel.app
          return origin.endsWith(suffix);
        }
        return false;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      // Default to allowed with origin reflection if no strict mismatch
      return callback(null, true);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RestResponseInterceptor());

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`MOMS RESTful API server is running on http://0.0.0.0:${port} (api/v1, /health)`);
}

bootstrap();
