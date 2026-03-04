import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateQuoteDto {
  @IsNotEmpty()
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  author?: string;
}
