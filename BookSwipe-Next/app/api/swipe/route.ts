import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('=== SWIPE API CALLED ===');
    const body = await request.json();
    
    const { userId, bookId, action } = body;
    
    // Проверяем обязательные поля
    if (!userId || !bookId || !action) {
      console.error('Missing required fields:', { userId, bookId, action });
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }

    // Проверяем корректность действия
    if (!['like', 'dislike'].includes(action)) {
      console.error('Invalid action:', action);
      return NextResponse.json(
        { success: false, error: 'Некорректное действие' },
        { status: 400 }
      );
    }

    // Преобразуем userId и bookId в числа
    const userIdNumber = Number(userId);
    const bookIdNumber = Number(bookId);
    
    if (isNaN(userIdNumber) || isNaN(bookIdNumber)) {
      console.error('Invalid IDs:', { userId, bookId });
      return NextResponse.json(
        { success: false, error: 'Неверный формат ID' },
        { status: 400 }
      );
    }

    console.log('Saving swipe:', { userIdNumber, bookIdNumber, action });

    // Проверяем существование пользователя
    const userCheck = db.prepare('SELECT id FROM User WHERE id = ?').get(userIdNumber);
    if (!userCheck) {
      console.error('User not found:', userIdNumber);
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем существование книги
    const bookCheck = db.prepare('SELECT id FROM Book WHERE id = ?').get(bookIdNumber);
    if (!bookCheck) {
      console.error('Book not found:', bookIdNumber);
      return NextResponse.json(
        { success: false, error: 'Книга не найдена' },
        { status: 404 }
      );
    }

    // Удаляем старый свайп если есть
    db.prepare(`
      DELETE FROM Swipe 
      WHERE user_id = ? AND book_id = ?
    `).run(userIdNumber, bookIdNumber);

    // Добавляем новый свайп
    const stmt = db.prepare(`
      INSERT INTO Swipe (user_id, book_id, type, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userIdNumber, 
      bookIdNumber, 
      action, 
      new Date().toISOString()
    );

    console.log('Swipe saved successfully');

    return NextResponse.json({
      success: true,
      message: `Свайп сохранен: ${action}`,
      swipeId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Ошибка сохранения свайпа:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера'
      },
      { status: 500 }
    );
  }
}