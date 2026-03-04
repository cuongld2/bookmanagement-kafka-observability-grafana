import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsOptional()
  @IsNumber()
  publishedYear?: number;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
