-- Initialize database tables for book management application
-- This script creates the necessary tables if they don't exist

-- Create books table
CREATE TABLE IF NOT EXISTS book (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    "publishedYear" INTEGER,
    genre VARCHAR(255),
    description TEXT
);

-- Create index on title for better search performance
CREATE INDEX IF NOT EXISTS idx_book_title ON book (title);

-- Create index on author for better search performance
CREATE INDEX IF NOT EXISTS idx_book_author ON book (author);

-- Create index on genre for filtering
CREATE INDEX IF NOT EXISTS idx_book_genre ON book (genre);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quote (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    author VARCHAR(255)
);

-- Insert some sample quotes
INSERT INTO quote (text, author) VALUES
('Books are the plane, and the train, and the road. They are the destination, and the journey.', 'Anna Quindlen'),
('A reader lives a thousand lives before he dies. The man who never reads lives only one.', 'George R.R. Martin'),
('Reading is a discount ticket to everywhere.', 'Mary Schmich'),
('Books are a uniquely portable magic.', 'Stephen King'),
('The more that you read, the more things you will know. The more that you learn, the more places you''ll go.', 'Dr. Seuss'),
('A book is a dream that you hold in your hand.', 'Neil Gaiman'),
('Reading gives us someplace to go when we have to stay where we are.', 'Mason Cooley'),
('Books are mirrors: you only see in them what you already have inside you.', 'Carlos Ruiz Zafón'),
('The world was hers for the reading.', 'Betty Smith'),
('Reading is an exercise in empathy; an exercise in walking in someone else''s shoes for a while.', 'Malorie Blackman');
