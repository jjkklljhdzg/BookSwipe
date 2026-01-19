// app/api/books/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const books = db
      .prepare(`
        SELECT
          id,
          title,
          author,
          genres,
          published_at as publishedAt,
          annotation,
          series_title as seriesTitle,
          series_number as seriesNumber,
          cover_url as coverUrl,
          created_at as createdAt
        FROM Book
        ORDER BY created_at DESC
      `)
      .all();

    // Добавляем рейтинг и количество отзывов
    const booksWithRating = books.map((book: any) => {
      // Получаем рейтинг для книги
      const ratingData = db
        .prepare(`
          SELECT 
            AVG(rating) as averageRating,
            COUNT(*) as reviewCount
          FROM Review 
          WHERE book_id = ?
        `)
        .get(book.id);
      
      return {
        ...book,
        rating: ratingData?.averageRating ? parseFloat(ratingData.averageRating).toFixed(1) : '0.0',
        reviewCount: ratingData?.reviewCount || 0
      };
    });

    return NextResponse.json(booksWithRating);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ 
      error: 'Failed to load books' 
    }, { status: 500 });
  }
}