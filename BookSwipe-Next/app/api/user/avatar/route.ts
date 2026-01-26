import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, avatar } = await request.json();

    if (!email || !avatar) {
      return NextResponse.json(
        { success: false, error: 'Email и аватар обязательны' },
        { status: 400 }
      );
    }

    // Обновляем аватар в базе данных
    dbHelpers.updateUserAvatar(email, avatar);

    return NextResponse.json({
      success: true,
      message: 'Аватар обновлен'
    });

  } catch (error) {
    console.error('Avatar update error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении аватара' },
      { status: 500 }
    );
  }
}
