import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerModule } from './worker/worker.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bookdb',
      entities: [join(__dirname, '**', '*.entity{.ts,.js}')],
      synchronize: false,
      retryAttempts: 3,
      retryDelay: 3000,
      extra: {
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        keepAlive: true,
        application_name: 'bookmanagement-worker',
      },
    }),
    WorkerModule,
  ],
})
export class WorkerAppModule {}
