import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RestResponseInterceptor } from './common/interceptors/transform.interceptor';
import { Request, Response, NextFunction } from 'express';
import { join } from 'path';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevels: ('log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal')[] = isProduction
    ? ['log', 'warn', 'error', 'fatal'] // Production disables Debug logging
    : ['debug', 'log', 'warn', 'error', 'fatal']; // Development includes Debug

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevels,
  });

  // Backward-compatibility & URL Normalizer:
  // Handles unversioned /api/... or direct /auth/login, /users, etc., rewriting them to /api/v1/... (excluding health, root, and static uploads)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawPath = req.url.split('?')[0];
    const isExcluded =
      rawPath === '' ||
      rawPath === '/' ||
      rawPath === '/health' ||
      rawPath.startsWith('/health') ||
      // Uploaded script documents and deliverables are served as static files from
      // /uploads/... and must not be rewritten to /api/v1/uploads/... or they 404.
      rawPath === '/uploads' ||
      rawPath.startsWith('/uploads/');
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

  // Serve uploaded files (script documents, storyboards, deliverables) from disk.
  // FileMetadata.storagePath is stored as "/uploads/<relative path>", so the upload root is
  // mounted at the /uploads prefix. Without this, every "View Script" link 404s.
  const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  console.log(`Serving uploaded files from ${uploadDir} at /uploads/`);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RestResponseInterceptor());

  const port = process.env.PORT || 4000;
  const host = process.env.HOST;
  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
  console.log(`MOMS RESTful API server is running on http://localhost:${port} (api/v1, /health)`);
}

bootstrap();
