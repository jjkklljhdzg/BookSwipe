// app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - получение отзывов пользователя
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }

    console.log('📥 Получение отзывов для пользователя ID:', userId);

    const reviews = db
      .prepare(`
        SELECT 
          r.id,
          r.rating,
          r.text,
          r.created_at,
          r.book_id as bookId,
          b.title as bookTitle,
          b.author as bookAuthor,
          b.cover_url as bookImage
        FROM Review r
        JOIN Book b ON r.book_id = b.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `)
      .all(parseInt(userId)) as any[];

    const formattedReviews = reviews.map((review) => ({
      ...review,
      date: new Date(review.created_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }));

    return NextResponse.json({
      success: true,
      reviews: formattedReviews
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении отзывов' },
      { status: 500 }
    );
  }
}

// POST - сохранение отзыва
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, bookId, rating, text } = body;

    console.log('📤 Saving review to DB:', { userId, bookId, rating });

    if (!userId || !bookId || !rating) {
      return NextResponse.json(
        { success: false, error: 'Не все обязательные поля заполнены' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Рейтинг должен быть от 1 до 5' },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже отзыв от этого пользователя
    const existingReview = db
      .prepare('SELECT id FROM Review WHERE user_id = ? AND book_id = ?')
      .get(parseInt(userId.toString()), parseInt(bookId.toString()));

    let reviewId;

    if (existingReview) {
      // Обновляем существующий отзыв
      const stmt = db.prepare(`
        UPDATE Review 
        SET rating = ?, text = ?, created_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(rating, text || '', existingReview.id);
      reviewId = existingReview.id;
      console.log('✅ Updated existing review');
    } else {
      // Создаем новый отзыв
      const stmt = db.prepare(`
        INSERT INTO Review (user_id, book_id, rating, text, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);
      const result = stmt.run(
        parseInt(userId.toString()), 
        parseInt(bookId.toString()), 
        parseInt(rating.toString()), 
        text || ''
      );
      reviewId = result.lastInsertRowid;
      console.log('✅ Created new review, ID:', reviewId);
    }

    return NextResponse.json({
      success: true,
      reviewId: reviewId,
      message: 'Отзыв успешно сохранен'
    });
  } catch (error) {
    console.error('Error saving review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save review' },
      { status: 500 }
    );
  }
}