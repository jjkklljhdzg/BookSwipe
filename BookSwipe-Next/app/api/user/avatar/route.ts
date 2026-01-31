import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, avatar } = await request.json();

    console.log('POST /api/user/avatar:', {
      email,
      hasAvatar: !!avatar,
      avatarLength: avatar?.length,
      isDataURL: avatar?.startsWith?.('data:image')
    });

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email обязателен' },
        { status: 400 }
      );
    }

    if (!avatar) {
      return NextResponse.json(
        { success: false, message: 'Аватар обязателен' },
        { status: 400 }
      );
    }

    // Обновляем аватар в базе данных
    const result = dbHelpers.updateUserProfile(email, { avatar });
    console.log('Avatar update result:', result);

    if (result && result.changes === 0) {
      return NextResponse.json(
        { success: false, message: 'Пользователь не найден или данные не изменились' },
        { status: 404 }
      );
    }

    // Получаем обновленного пользователя
    const updatedUser = dbHelpers.getUserProfile(email);
    console.log('After update - user:', updatedUser);

    return NextResponse.json({
      success: true,
      message: 'Аватар успешно обновлен',
      avatar: updatedUser?.avatar
    });

  } catch (error: any) {
    console.error('Avatar API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ошибка при обновлении аватара',
        error: error.message
      },
      { status: 500 }
    );
  }
}