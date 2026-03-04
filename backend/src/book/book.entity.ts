import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  publishedYear: number;

  @Column({ nullable: true })
  genre: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
