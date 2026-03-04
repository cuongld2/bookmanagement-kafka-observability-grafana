import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './quote.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
  ) {}

  async create(createQuoteDto: CreateQuoteDto): Promise<Quote> {
    const quote = this.quoteRepository.create(createQuoteDto);
    return await this.quoteRepository.save(quote);
  }

  async findRandom(): Promise<Quote | null> {
    const quotes = await this.quoteRepository.find();
    if (quotes.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    // Ensure author is never null
    return {
      ...quote,
      author: quote.author || 'Unknown Author',
    };
  }

  async findAll(): Promise<Quote[]> {
    return await this.quoteRepository.find();
  }

  async findOne(id: number): Promise<Quote | null> {
    return await this.quoteRepository.findOne({ where: { id } });
  }

  async remove(id: number): Promise<void> {
    await this.quoteRepository.delete(id);
  }
}
