import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { Quote } from './quote.entity';

@Controller('quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto): Promise<Quote> {
    return await this.quoteService.create(createQuoteDto);
  }

  @Get('random')
  async findRandom(): Promise<Quote | null> {
    return await this.quoteService.findRandom();
  }

  @Get()
  async findAll(): Promise<Quote[]> {
    return await this.quoteService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Quote | null> {
    return await this.quoteService.findOne(+id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return await this.quoteService.remove(+id);
  }
}
