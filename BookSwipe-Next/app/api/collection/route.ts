import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('=== COLLECTION POST API CALLED ===');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { userId, bookId, collectionType } = body;
    
    if (!userId || !bookId || !collectionType) {
      console.error('Missing fields:', { userId, bookId, collectionType });
      return NextResponse.json(
        { success: false, error: 'Отсутствуют обязательные поля' },
        { status: 400 }
      );
    }

    // Проверяем существование пользователя
    console.log('Checking user with ID:', userId);
    const userCheck = db.prepare('SELECT id, email FROM User WHERE id = ?').get(userId);
    console.log('User check result:', userCheck);
    
    if (!userCheck) {
      console.error('User not found in database');
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверяем существование книги
    console.log('Checking book with ID:', bookId);
    const bookCheck = db.prepare('SELECT id FROM Book WHERE id = ?').get(bookId);
    console.log('Book check result:', bookCheck);
    
    if (!bookCheck) {
      return NextResponse.json(
        { success: false, error: 'Книга не найдена' },
        { status: 404 }
      );
    }

    // Проверяем есть ли уже запись
    const existing = db.prepare(`
      SELECT * FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId);
    console.log('Existing record:', existing);

    // Удаляем старую запись если есть
    const deleteResult = db.prepare(`
      DELETE FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).run(userId, bookId);
    console.log('Deleted records:', deleteResult.changes);

    // Добавляем новую запись
    const stmt = db.prepare(`
      INSERT INTO Collection (user_id, book_id, collection_type, created_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId, 
      bookId, 
      collectionType, 
      new Date().toISOString()
    );

    console.log('Insert result:', result);
    console.log('✅ Collection saved successfully');

    return NextResponse.json({
      success: true,
      message: `Книга добавлена в коллекцию: ${collectionType}`,
      collectionId: result.lastInsertRowid,
      userId: userId
    });
  } catch (error) {
    console.error('❌ Ошибка сохранения коллекции:', error);
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