import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { QuoteModule } from './quote/quote.module';
import { ObservabilityModule } from './observability/observability.module';
import { KafkaModule } from './kafka/kafka.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KafkaModule,
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
        application_name: 'bookmanagement-backend',
      },
    }),
    BookModule,
    QuoteModule,
    ObservabilityModule,
    KafkaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
