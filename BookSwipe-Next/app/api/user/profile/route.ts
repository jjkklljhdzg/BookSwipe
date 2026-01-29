// api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Получение профиля (POST метод)
export async function POST(request: Request) {
  try {
    console.log('=== PROFILE POST API CALLED ===');
    const { email } = await request.json();
    console.log('Request email:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('SELECT id, email, nickname, avatar_url FROM User WHERE email = ?');
    const user = stmt.get(email);

    console.log('User from DB:', user);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      name: user.nickname,
      avatar_url: user.avatar_url,
      avatar: user.avatar_url
    });

  } catch (error) {
    console.error('Profile POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении профиля' },
      { status: 500 }
    );
  }
}

// Обновление профиля (PUT метод)
export async function PUT(request: Request) {
  try {
    console.log('=== PROFILE PUT API CALLED ===');
    const { email, name, avatar } = await request.json();
    
    console.log('PUT request data:', { email, name, avatar });

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    // Проверяем существование пользователя
    const checkStmt = db.prepare('SELECT id FROM User WHERE email = ?');
    const existingUser = checkStmt.get(email);
    
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Обновляем профиль
    const updateStmt = db.prepare(`
      UPDATE User 
      SET nickname = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `);
    
    const result = updateStmt.run(name, avatar, email);
    console.log('Update result:', result);

    // Получаем обновленные данные
    const getStmt = db.prepare('SELECT id, email, nickname, avatar_url FROM User WHERE email = ?');
    const updatedUser = getStmt.get(email);

    return NextResponse.json({
      success: true,
      message: 'Профиль обновлен',
      id: updatedUser.id,
      name: updatedUser.nickname,
      avatar: updatedUser.avatar_url
    });

  } catch (error) {
    console.error('PUT Profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' },
      { status: 500 }
    );
  }
}