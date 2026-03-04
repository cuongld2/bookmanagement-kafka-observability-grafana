import { NestFactory } from '@nestjs/core';
import { WorkerAppModule } from './worker-app.module';
import { initTracing } from './lib/tracing';
import { KafkaWorkerService } from './worker/kafka-worker.service';

initTracing();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const workerService = app.get(KafkaWorkerService);
  if (!workerService) {
    console.error('Failed to initialize Kafka worker service');
    process.exit(1);
  }

  console.log('Kafka worker started successfully');
}

bootstrap().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
