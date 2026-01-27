import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, bookId } = await request.json();
    
    console.log('Remove collection request:', { userId, bookId });
    
    if (!userId || !bookId) {
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }

    // Проверяем существование пользователя
    const userCheck = db.prepare('SELECT id FROM User WHERE id = ?').get(userId);
    if (!userCheck) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Удаляем запись КОНКРЕТНОГО пользователя
    const result = db.prepare(`
      DELETE FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).run(userId, bookId);

    console.log(`Removed collection item for user ${userId}, book ${bookId}. Changes: ${result.changes}`);

    return NextResponse.json({
      success: true,
      message: 'Книга удалена из коллекции',
      changes: result.changes
    });
  } catch (error) {
    console.error('Ошибка удаления из коллекции:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}