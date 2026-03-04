import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaService } from './kafka.service';
import { Book } from '../book/book.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
