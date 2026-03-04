import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

// Custom metrics for the book management application
export const BOOKS_CREATED_COUNTER = 'books_created_total';
export const BOOKS_UPDATED_COUNTER = 'books_updated_total';
export const BOOKS_DELETED_COUNTER = 'books_deleted_total';
export const HTTP_REQUEST_DURATION = 'http_request_duration_seconds';
export const DATABASE_QUERY_DURATION = 'database_query_duration_seconds';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
    }),
  ],
  providers: [
    // Counter for books created
    makeCounterProvider({
      name: BOOKS_CREATED_COUNTER,
      help: 'Total number of books created',
      labelNames: ['category'],
    }),
    // Counter for books updated
    makeCounterProvider({
      name: BOOKS_UPDATED_COUNTER,
      help: 'Total number of books updated',
    }),
    // Counter for books deleted
    makeCounterProvider({
      name: BOOKS_DELETED_COUNTER,
      help: 'Total number of books deleted',
    }),
    // Histogram for HTTP request duration
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),
    // Histogram for database query duration
    makeHistogramProvider({
      name: DATABASE_QUERY_DURATION,
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    }),
  ],
  exports: [PrometheusModule],
})
export class ObservabilityModule {}
