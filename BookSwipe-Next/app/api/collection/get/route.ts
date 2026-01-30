// app/api/collection/get/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Требуется userId' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    
    // 1. Проверяем пользователя
    const user = db.prepare('SELECT id, email FROM User WHERE id = ?').get(userIdNum);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }
    
    console.log(`Getting collection for user: ${user.email} (ID: ${userIdNum})`);
    
    // 2. Простой запрос без JOIN
    const collection = db.prepare(`
      SELECT 
        id,
        book_id,
        collection_type,
        created_at
      FROM Collection 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userIdNum);
    
    console.log(`Raw collection items: ${collection.length}`);
    
    // 3. Для каждой записи получаем информацию о книге
    const collectionWithBooks = [];
    
    for (const item of collection) {
      try {
        const book = db.prepare('SELECT * FROM Book WHERE id = ?').get(item.book_id);
        
        if (book) {
          collectionWithBooks.push({
            ...item,
            title: book.title,
            author: book.author,
            cover_url: book.cover_url || '/img/default-book.jpg',
            genres: book.genres || '',
            rating: book.rating || '0.0'
          });
        }
      } catch (bookError) {
        console.error(`Error getting book ${item.book_id}:`, bookError);
      }
    }
    
    console.log(`Final collection with books: ${collectionWithBooks.length} items`);
    
    return NextResponse.json({
      success: true,
      collection: collectionWithBooks,
      count: collectionWithBooks.length,
      userId: userIdNum,
      userEmail: user.email
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения коллекции:', error);
    
    // Показываем больше информации об ошибке
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}