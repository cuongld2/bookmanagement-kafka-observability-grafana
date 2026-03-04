import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Request, Response } from 'express';
import { initTracing } from './lib/tracing';

// Initialize OpenTelemetry tracing before app starts
initTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend communication
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow localhost and 127.0.0.1 origins (for development)
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }

      // Allow the configured frontend URL
      const allowedOrigin = process.env.FRONTEND_URL;
      if (allowedOrigin && origin === allowedOrigin) {
        return callback(null, true);
      }

      // Allow frontend service internal URL
      if (origin === 'http://frontend-service:3000') {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable global validation pipes
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3001);
  console.log('Server is listening on port', process.env.PORT ?? 3001);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
