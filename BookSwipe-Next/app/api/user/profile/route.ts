// app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

// Получение профиля
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const user = dbHelpers.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Не возвращаем пароль
    const { password, ...userData } = user;

    return NextResponse.json({
      success: true,
      ...userData
    });

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении профиля' },
      { status: 500 }
    );
  }
}

// Обновление профиля
export async function PUT(request: Request) {
  try {
    const { email, name, avatar } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    dbHelpers.updateUserProfile(email, { name, avatar });

    return NextResponse.json({
      success: true,
      message: 'Профиль обновлен'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' },
      { status: 500 }
    );
  }
}
