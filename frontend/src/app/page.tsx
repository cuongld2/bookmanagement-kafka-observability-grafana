'use client';

import Layout from '@/components/layout';
import { useState, useEffect } from 'react';

interface Book {
  id: number;
  title: string;
  author: string;
  publishedYear?: number;
  genre?: string;
  description?: string;
}

interface Quote {
  id: number;
  text: string;
  author: string;
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publishedYear: '',
    genre: '',
    description: '',
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    fetchBooks();
    fetchRandomQuote();
  }, []);

  const fetchRandomQuote = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quotes/random`);
      if (response.ok) {
        const quote = await response.json();
        setCurrentQuote(quote);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    }
  };

  useEffect(() => {
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(fetchRandomQuote, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/books`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bookData = {
      title: formData.title,
      author: formData.author,
      publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : undefined,
      genre: formData.genre || undefined,
      description: formData.description || undefined,
    };

    try {
      if (editingBook) {
        // Update book
        const response = await fetch(`${API_BASE_URL}/books/${editingBook.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookData),
        });

        if (response.ok) {
          await fetchBooks();
          resetForm();
        }
      } else {
        // Create new book
        const response = await fetch(`${API_BASE_URL}/books`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookData),
        });

        if (response.ok) {
          await fetchBooks();
          resetForm();
        }
      }
    } catch (error) {
      console.error('Error saving book:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this masterpiece?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/books/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchBooks();
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      publishedYear: book.publishedYear?.toString() || '',
      genre: book.genre || '',
      description: book.description || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      publishedYear: '',
      genre: '',
      description: '',
    });
    setEditingBook(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <Layout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center relative overflow-hidden">
        {/* Van Gogh inspired background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="stars" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="25" cy="25" r="1" fill="#FFD700" opacity="0.6"/>
                <circle cx="10" cy="40" r="0.5" fill="#FFA500"/>
                <circle cx="40" cy="10" r="0.8" fill="#FF8C00"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#stars)"/>
          </svg>
        </div>

        <div className="text-center z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-300 border-t-yellow-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">Awakening the Masterpieces...</h2>
          <p className="text-yellow-100 mt-2">Bringing your literary collection to life</p>
        </div>
      </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">

      <div className="relative z-10 min-h-screen">
        {/* Artistic header */}
        <header className="py-12 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-6xl md:text-7xl font-bold text-gray-800 mb-4 drop-shadow-2xl transform -rotate-1">
              Literary Canvas
            </h1>
            <p
              className="text-xl md:text-2xl text-gray-600 mb-8 drop-shadow-lg italic cursor-pointer hover:text-gray-800 transition-colors duration-300"
              onClick={fetchRandomQuote}
              title="Click to get a new random quote"
            >
              &ldquo;{currentQuote?.text || 'Books are the plane, and the train, and the road. They are the destination, and the journey.'}&rdquo;
            </p>
            {currentQuote && (
              <p className="text-lg text-gray-500 mb-4">- {currentQuote.author}</p>
            )}
            <div className="flex justify-center">
              <button
                onClick={() => setShowForm(!showForm)}
                className="group relative px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold text-lg rounded-full shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10">{showForm ? '✗ Close Canvas' : '🎨 Create Masterpiece'}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 pb-12">
          {/* Artistic form modal */}
          {showForm && (
            <div className="mb-12">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-gray-200 backdrop-blur-sm">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-gray-800 mb-2">
                    {editingBook ? '✏️ Refine Your Creation' : '🎨 Birth a New Masterpiece'}
                  </h2>
                  <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📖 Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        placeholder="The Starry Night..."
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        👨‍🎨 Author *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        placeholder="Vincent van Gogh..."
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        📅 Year Created
                      </label>
                      <input
                        type="number"
                        value={formData.publishedYear}
                        onChange={(e) => setFormData({ ...formData, publishedYear: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        placeholder="1889..."
                      />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        🎭 Artistic Style
                      </label>
                      <input
                        type="text"
                        value={formData.genre}
                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        placeholder="Post-Impressionism..."
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📜 Artistic Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 resize-none"
                      placeholder="A swirling night sky over a quiet village, with eleven stars and a crescent moon..."
                    />
                  </div>
                  <div className="flex gap-4 justify-center pt-4">
                    <button
                      type="submit"
                      className="group relative px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-xl hover:shadow-green-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">{editingBook ? '✨ Refine Artwork' : '🎨 Create Masterpiece'}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="group relative px-8 py-3 bg-gradient-to-r from-gray-600 to-slate-700 text-white font-bold rounded-full shadow-xl hover:shadow-gray-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">❌ Abandon Canvas</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Artistic book gallery */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800">
                    🎨 Masterpiece Gallery
                  </h2>
                  <p className="text-gray-600 mt-1">{books.length} Literary Treasures</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-blue-600">{books.length}</div>
                  <div className="text-sm text-gray-600">Works of Art</div>
                </div>
              </div>
            </div>

            <div className="p-8">
              {books.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-8xl mb-4">🎨</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Your Canvas Awaits</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Begin your artistic journey by adding your first literary masterpiece to the gallery
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {books.map((book) => (
                    <div key={book.id} className="group relative bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-blue-300 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-100/50 transform hover:scale-105">
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-2">{book.title}</h3>
                            <p className="text-gray-600 font-semibold">by {book.author}</p>
                          </div>
                          <div className="text-blue-600 text-2xl ml-2">📚</div>
                        </div>

                        <div className="space-y-2 mb-4">
                          {book.publishedYear && (
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Created: {book.publishedYear}
                            </div>
                          )}
                          {book.genre && (
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                              Style: {book.genre}
                            </div>
                          )}
                        </div>

                        {book.description && (
                      <p className="text-sm text-gray-700 mb-4 line-clamp-3 italic">
                        &ldquo;{book.description}&rdquo;
                      </p>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(book)}
                            className="group/btn relative flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden text-sm"
                          >
                            <span className="relative z-10">✏️ Refine</span>
                            <div className="absolute inset-0 bg-blue-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          </button>
                          <button
                            onClick={() => handleDelete(book.id)}
                            className="group/btn relative flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-red-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden text-sm"
                          >
                            <span className="relative z-10">🗑️ Remove</span>
                            <div className="absolute inset-0 bg-red-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
