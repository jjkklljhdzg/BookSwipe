// api/collection/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const bookId = url.searchParams.get('bookId');
    
    console.log('=== CHECK COLLECTION API CALLED ===');
    console.log('Params:', { userId, bookId });
    
    if (!userId || !bookId) {
      return NextResponse.json(
        { success: false, error: 'Требуется userId и bookId' },
        { status: 400 }
      );
    }

    // Проверяем существование пользователя
    const userCheck = db.prepare('SELECT id FROM User WHERE id = ?').get(parseInt(userId));
    if (!userCheck) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли книга в коллекции пользователя
    const collectionItem = db.prepare(`
      SELECT collection_type 
      FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).get(parseInt(userId), parseInt(bookId));

    console.log('Query result:', collectionItem);

    return NextResponse.json({
      success: true,
      inCollection: !!collectionItem,
      collectionType: collectionItem ? collectionItem.collection_type : null,
      userId: parseInt(userId),
      bookId: parseInt(bookId)
    });
  } catch (error) {
    console.error('❌ Ошибка проверки коллекции:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}