import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaWorkerService } from './kafka-worker.service';
import { Book } from '../book/book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  providers: [KafkaWorkerService],
  exports: [KafkaWorkerService],
})
export class WorkerModule {}
