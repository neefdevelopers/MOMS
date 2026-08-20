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

  // Backward-compatibility: Normalize unversioned /api/... requests to /api/v1/... (unless already /api/v1 or /api/v2)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/') && !req.url.startsWith('/api/v2/')) {
      req.url = req.url.replace('/api/', '/api/v1/');
    }
    next();
  });

  // All endpoints strictly prefixed with /api/v1
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: true,
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
  await app.listen(port);
  console.log(`MOMS RESTful API server is running on http://localhost:${port}/api (v1 supported)`);
}

bootstrap();
