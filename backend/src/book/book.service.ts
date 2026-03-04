import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity';
import { KafkaService, BookEvent } from '../kafka/kafka.service';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    private kafkaService: KafkaService,
  ) {}

  findAll(): Promise<Book[]> {
    return this.bookRepository.find();
  }

  findOne(id: number): Promise<Book | null> {
    return this.bookRepository.findOneBy({ id });
  }

  async create(book: Partial<Book>): Promise<Partial<Book>> {
    const event: BookEvent = {
      action: 'CREATE',
      book: book,
      timestamp: new Date().toISOString(),
    };
    await this.kafkaService.sendBookEvent(event);

    return book;
  }

  async update(id: number, book: Partial<Book>): Promise<Partial<Book>> {
    const existingBook = await this.findOne(id);
    if (!existingBook) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const event: BookEvent = {
      action: 'UPDATE',
      bookId: id,
      book: book,
      timestamp: new Date().toISOString(),
    };
    await this.kafkaService.sendBookEvent(event);

    return { id, ...book };
  }

  async remove(id: number): Promise<void> {
    const existingBook = await this.findOne(id);
    if (!existingBook) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const event: BookEvent = {
      action: 'DELETE',
      bookId: id,
      timestamp: new Date().toISOString(),
    };
    await this.kafkaService.sendBookEvent(event);
  }
}
