import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../book/book.entity';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export interface BookEvent {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  bookId?: number;
  book?: Partial<Book>;
  timestamp: string;
}

const tracer = trace.getTracer('kafka-consumer');

@Injectable()
export class KafkaWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaWorkerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly topic = 'book-events';

  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
  ) {}

  async onModuleInit() {
    const broker =
      process.env.KAFKA_BROKER || 'kafka.bookmanagement.svc.cluster.local:9092';

    this.logger.log(`Worker connecting to Kafka broker: ${broker}`);

    this.kafka = new Kafka({
      clientId: 'bookmanagement-worker',
      brokers: [broker],
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: 'bookmanagement-worker-group',
    });

    await this.consumer.connect();
    this.logger.log('Worker Kafka consumer connected');

    await this.consumer.subscribe({
      topic: this.topic,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const value = message.value;
          if (!value) {
            this.logger.warn('Received message with null value');
            return;
          }

          let valueStr: string;
          if (Buffer.isBuffer(value)) {
            valueStr = value.toString();
          } else {
            valueStr = String(value);
          }

          if (typeof valueStr !== 'string') {
            this.logger.warn(`Received message with invalid value type`);
            return;
          }

          const event = JSON.parse(valueStr) as BookEvent;
          await this.processEvent(event);
        } catch (error) {
          this.logger.error('Error processing Kafka message', error as string);
        }
      },
    });

    this.logger.log(`Worker subscribed to topic: ${this.topic}`);
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect();
  }

  private async processEvent(event: BookEvent) {
    await tracer.startActiveSpan('kafka.consumer.process', async (span) => {
      try {
        span.setAttribute('messaging.system', 'kafka');
        span.setAttribute('messaging.destination', this.topic);
        span.setAttribute('messaging.operation', 'process');
        span.setAttribute('messaging.kafka.message_key', event.bookId?.toString() || '');
        span.setAttribute('messaging.kafka.topic', this.topic);
        span.setAttribute('messaging.kafka.event_type', event.action);

        this.logger.log(`Worker processing event: ${event.action}`);

        switch (event.action) {
          case 'CREATE':
            if (event.book) {
              const newBook = this.bookRepository.create(event.book);
              await this.bookRepository.save(newBook);
              span.setAttribute('messaging.kafka.book_id', newBook.id?.toString() || '');
              this.logger.log(`Worker created book: ${newBook.id}`);
            }
            break;

          case 'UPDATE':
            if (event.bookId && event.book) {
              await this.bookRepository.update(event.bookId, event.book);
              span.setAttribute('messaging.kafka.book_id', event.bookId.toString());
              this.logger.log(`Worker updated book: ${event.bookId}`);
            }
            break;

          case 'DELETE':
            if (event.bookId) {
              await this.bookRepository.delete(event.bookId);
              span.setAttribute('messaging.kafka.book_id', event.bookId.toString());
              this.logger.log(`Worker deleted book: ${event.bookId}`);
            }
            break;
        }

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
