import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Заполните все поля' },
        { status: 400 }
      );
    }

    const user = dbHelpers.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 401 }
      );
    }

    // Обратите внимание: password_hash, а не password
    if (user.password_hash !== password) {
      return NextResponse.json(
        { success: false, error: 'Неверный пароль' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      name: user.nickname, // nickname, а не name
      email: user.email,
      avatar: user.avatar_url // avatar_url, а не avatar
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}