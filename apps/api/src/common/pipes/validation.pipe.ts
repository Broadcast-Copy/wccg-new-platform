import { ValidationPipe as NestValidationPipe } from '@nestjs/common';

/**
 * Pre-configured ValidationPipe for the WCCG API.
 * Applied globally in main.ts via app.useGlobalPipes().
 */
export function createValidationPipe(): NestValidationPipe {
  return new NestValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });
}
