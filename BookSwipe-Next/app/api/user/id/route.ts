import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('=== USER ID API CALLED ===');
    const body = await request.json();
    console.log('Request body:', body);
    
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    console.log('Looking for user with email:', email);
    
    const stmt = db.prepare('SELECT id, nickname, email, avatar_url as avatar FROM User WHERE email = ?');
    const user = stmt.get(email);
    
    console.log('Database query result:', user);
    
    if (!user) {
      console.log('User not found, checking all users...');
      
      // Проверяем все пользователи в базе
      const allUsers = db.prepare('SELECT id, email, nickname FROM User').all();
      console.log('All users in database:', allUsers);
      
      // Создаем пользователя, если не существует
      try {
        const insertStmt = db.prepare(`
          INSERT INTO User (email, nickname, avatar_url, password_hash) 
          VALUES (?, ?, ?, ?)
        `);
        
        const defaultNickname = email.split('@')[0];
        const defaultAvatar = '/img/ava.jpg';
        const defaultPassword = 'temp_' + Date.now();
        
        const result = insertStmt.run(
          email,
          defaultNickname,
          defaultAvatar,
          defaultPassword
        );
        
        const newUserId = result.lastInsertRowid;
        console.log('Created new user with ID:', newUserId);
        
        return NextResponse.json({
          success: true,
          userId: newUserId,
          name: defaultNickname,
          message: 'Пользователь создан'
        });
        
      } catch (insertError) {
        console.error('Error creating user:', insertError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Пользователь не найден и не может быть создан',
            allUsers: allUsers
          },
          { status: 404 }
        );
      }
    }

    console.log('User found:', { 
      id: user.id, 
      nickname: user.nickname,
      email: user.email 
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      name: user.nickname || 'Пользователь',
      email: user.email,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Ошибка получения ID пользователя:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}