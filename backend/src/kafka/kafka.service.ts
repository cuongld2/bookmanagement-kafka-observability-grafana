import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
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

const tracer = trace.getTracer('kafka-producer');

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private readonly topic = 'book-events';
  private kafkaEnabled = false;

  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
  ) {
    this.logger.log('KafkaService constructor called');
  }

  async onModuleInit() {
    const broker =
      process.env.KAFKA_BROKER || 'kafka.bookmanagement.svc.cluster.local:9092';

    const kafkaEnabled = process.env.KAFKA_ENABLED !== 'false';
    if (!kafkaEnabled) {
      this.logger.log('Kafka is disabled. Set KAFKA_ENABLED=true to enable.');
      return;
    }

    const kafkaConsumerEnabled = process.env.KAFKA_CONSUMER_ENABLED === 'true';

    this.logger.log(`Connecting to Kafka broker: ${broker}`);

    this.kafka = new Kafka({
      clientId: 'bookmanagement-backend',
      brokers: [broker],
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    });

    this.producer = this.kafka.producer();

    if (kafkaConsumerEnabled) {
      this.consumer = this.kafka.consumer({ groupId: 'bookmanagement-group' });
    }

    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');

      if (!kafkaConsumerEnabled) {
        this.logger.log(
          'Kafka consumer disabled (use worker for processing events)',
        );
        this.kafkaEnabled = true;
        return;
      }

      await this.consumer.connect();
      this.logger.log('Kafka consumer connected');

      await this.ensureTopicExists();

      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: false,
      });

      await this.consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
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
            this.logger.error(
              'Error processing Kafka message',
              error as string,
            );
          }
        },
      });

      this.logger.log(`Kafka consumer subscribed to topic: ${this.topic}`);
      this.kafkaEnabled = true;
    } catch (error) {
      this.logger.error('Failed to initialize Kafka', error as string);
      this.kafkaEnabled = false;
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
    await this.consumer?.disconnect();
  }

  async sendBookEvent(event: BookEvent): Promise<void> {
    if (!this.kafkaEnabled) {
      this.logger.debug('Kafka is not enabled, skipping event');
      return;
    }

    await tracer.startActiveSpan('kafka.producer.send', async (span) => {
      try {
        span.setAttribute('messaging.system', 'kafka');
        span.setAttribute('messaging.destination', this.topic);
        span.setAttribute('messaging.operation', 'publish');
        span.setAttribute('messaging.kafka.message_key', event.bookId?.toString() || '');
        span.setAttribute('messaging.kafka.topic', this.topic);

        await this.producer.send({
          topic: this.topic,
          messages: [
            {
              key: event.bookId?.toString() || undefined,
              value: JSON.stringify(event),
            },
          ],
        });
        
        span.setStatus({ code: SpanStatusCode.OK });
        this.logger.log(`Book event sent: ${event.action}`);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        this.logger.error('Failed to send book event', error as string);
        throw new Error('Failed to send Kafka event');
      } finally {
        span.end();
      }
    });
  }

  private async ensureTopicExists() {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      const topics = await admin.listTopics();
      if (!topics.includes(this.topic)) {
        await admin.createTopics({
          topics: [
            {
              topic: this.topic,
              numPartitions: 3,
              replicationFactor: 1,
            },
          ],
        });
        this.logger.log(`Created Kafka topic: ${this.topic}`);
      }
      await admin.disconnect();
    } catch (error) {
      this.logger.warn('Failed to ensure topic exists', error as string);
    }
  }

  private async processEvent(event: BookEvent) {
    this.logger.log(`Processing book event: ${event.action}`);

    switch (event.action) {
      case 'CREATE':
        if (event.book) {
          const newBook = this.bookRepository.create(event.book);
          await this.bookRepository.save(newBook);
          this.logger.log(`Book created via Kafka: ${newBook.id}`);
        }
        break;

      case 'UPDATE':
        if (event.bookId && event.book) {
          await this.bookRepository.update(event.bookId, event.book);
          this.logger.log(`Book updated via Kafka: ${event.bookId}`);
        }
        break;

      case 'DELETE':
        if (event.bookId) {
          await this.bookRepository.delete(event.bookId);
          this.logger.log(`Book deleted via Kafka: ${event.bookId}`);
        }
        break;
    }
  }
}
