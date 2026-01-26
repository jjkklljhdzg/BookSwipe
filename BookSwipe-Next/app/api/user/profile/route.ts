import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';
// Получение профиля (POST метод) - адаптировано
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
    const { password_hash, ...userData } = user;

    return NextResponse.json({
      success: true,
      ...userData,
      name: userData.nickname, // nickname как name
      avatar: userData.avatar_url // avatar_url как avatar
    });

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении профиля' },
      { status: 500 }
    );
  }
}

// Обновление профиля (PUT метод) - адаптировано из старого кода
export async function PUT(request: Request) {
  try {
    const { email, name, avatar } = await request.json();

    console.log('PUT /api/user/profile:', { email, name });

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обязателен' },
        { status: 400 }
      );
    }

    // Обновляем профиль в БД - используем старую рабочую логику
    dbHelpers.updateUserProfile(email, { name, avatar });

    // Получаем обновленные данные пользователя
    const updatedUser = dbHelpers.getUserByEmail(email);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Не возвращаем пароль
    const { password_hash, ...userData } = updatedUser;

    return NextResponse.json({
      success: true,
      message: 'Профиль обновлен',
      name: userData.nickname, // nickname как name
      avatar: userData.avatar_url // avatar_url как avatar
    });

  } catch (error) {
    console.error('PUT Profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении профиля' },
      { status: 500 }
    );
  }
}