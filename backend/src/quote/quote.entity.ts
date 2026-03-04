import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Quote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ nullable: true })
  author: string;
}
