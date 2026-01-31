// app/api/books/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('API: Получение книги, ID из params:', id);
    
    const bookId = parseInt(id);
    
    if (isNaN(bookId)) {
      return NextResponse.json(
        { error: 'Invalid book ID', receivedId: id },
        { status: 400 }
      );
    }

    const book = db
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
        WHERE id = ?
      `)
      .get(bookId) as any;

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found', bookId },
        { status: 404 }
      );
    }

    // Получаем рейтинг и отзывы из БД
    const ratingData = db
      .prepare(`
        SELECT 
          AVG(rating) as averageRating,
          COUNT(*) as reviewCount
        FROM Review 
        WHERE book_id = ?
      `)
      .get(bookId) as any;

    const reviews = db
      .prepare(`
        SELECT 
          r.id,
          r.rating,
          r.text,
          r.created_at as createdAt,
          u.nickname as userName,
          u.avatar_url as userAvatar
        FROM Review r
        LEFT JOIN User u ON r.user_id = u.id
        WHERE r.book_id = ?
        ORDER BY r.created_at DESC
      `)
      .all(bookId) as any[];

    const formattedReviews = reviews.map((review) => ({
      ...review,
      date: new Date(review.createdAt).toLocaleDateString('ru-RU')
    }));

    const bookWithDetails = {
      ...book,
      rating: ratingData?.averageRating ? 
        parseFloat(ratingData.averageRating).toFixed(1) : '0.0',
      reviewCount: ratingData?.reviewCount || 0,
      reviews: formattedReviews
    };

    return NextResponse.json(bookWithDetails);
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Failed to load book details' },
      { status: 500 }
    );
  }
}