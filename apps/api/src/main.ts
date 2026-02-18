import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // ── CORS ────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  // ── Global prefix ──────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Global pipes ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global filters ─────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Start ──────────────────────────────────────────────────────
  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  logger.log(`WCCG API listening on http://localhost:${port}/api/v1`);
}
bootstrap();
