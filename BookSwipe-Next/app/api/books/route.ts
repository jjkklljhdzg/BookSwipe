// app/api/books/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const books = db
      .prepare(`
        SELECT
          b.id,
          b.title,
          b.author,
          b.genres,
          b.published_at as publishedAt,
          b.annotation,
          b.series_title as seriesTitle,
          b.series_number as seriesNumber,
          b.cover_url as coverUrl,
          b.created_at as createdAt,
          COALESCE(r.averageRating, 0) as averageRating,
          COALESCE(r.reviewCount, 0) as reviewCount
        FROM Book b
        LEFT JOIN (
          SELECT 
            book_id,
            AVG(rating) as averageRating,
            COUNT(*) as reviewCount
          FROM Review
          GROUP BY book_id
        ) r ON b.id = r.book_id
        ORDER BY b.created_at DESC
      `)
      .all();

    // ФИЛЬТРУЕМ ДУБЛИКАТЫ ПО ID (добавьте этот блок)
    const uniqueBooks = [];
    const seenIds = new Set();
    
    for (const book of books) {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id);
        uniqueBooks.push(book);
      } else {
        console.warn(`Found duplicate book with ID: ${book.id}, title: ${book.title}`);
      }
    }

    // Форматируем рейтинг
    const booksWithRating = uniqueBooks.map((book: any) => ({
      ...book,
      rating: book.averageRating ? parseFloat(book.averageRating).toFixed(1) : '0.0',
      reviewCount: book.reviewCount || 0
    }));

    // Логируем если были дубликаты
    if (books.length !== uniqueBooks.length) {
      console.warn(`Removed ${books.length - uniqueBooks.length} duplicate books from API response`);
    }

    return NextResponse.json(booksWithRating);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ 
      error: 'Failed to load books' 
    }, { status: 500 });
  }
}