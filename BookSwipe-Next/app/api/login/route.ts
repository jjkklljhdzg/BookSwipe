// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('=== LOGIN API CALLED ===');
    const body = await request.json();
    const { email, password } = body;
    
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    // Ищем пользователя
    const stmt = db.prepare('SELECT * FROM User WHERE email = ?');
    const user = stmt.get(email);
    
    console.log('User found in DB:', user);

    if (!user) {
      // Если пользователя нет - создаем нового
      console.log('User not found, creating new user...');
      
      const insertStmt = db.prepare(`
        INSERT INTO User (email, password_hash, nickname, avatar_url)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = insertStmt.run(
        email,
        password,
        email.split('@')[0],
        '/img/ava.jpg'
      );
      
      console.log('New user created with ID:', result.lastInsertRowid);
      
      // Получаем созданного пользователя
      const newUser = db.prepare('SELECT * FROM User WHERE id = ?').get(result.lastInsertRowid);
      
      return NextResponse.json({
        success: true,
        name: newUser.nickname,
        email: newUser.email,
        message: 'Новый пользователь создан'
      });
    }

    // Проверяем пароль
    if (user.password_hash !== password) {
      console.log('Password incorrect');
      return NextResponse.json(
        { success: false, error: 'Неверный пароль' },
        { status: 401 }
      );
    }

    console.log('Login successful for user:', user.nickname);

    return NextResponse.json({
      success: true,
      name: user.nickname,
      email: user.email,
      userId: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}