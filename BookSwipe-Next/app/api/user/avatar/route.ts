import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, avatar } = await request.json();

    console.log('Avatar API called:', { 
      email, 
      avatarLength: avatar?.length,
      avatarStartsWithDataImage: avatar?.startsWith?.('data:image')
    });

    if (!email || !avatar) {
      return NextResponse.json(
        { success: false, error: 'Email и аватар обязательны' },
        { status: 400 }
      );
    }

    // Обновляем аватар в базе данных - используем старую рабочую логику
    dbHelpers.updateUserAvatar(email, avatar);

    // Получаем обновленного пользователя
    const updatedUser = dbHelpers.getUserByEmail(email);
    console.log('After update - user:', {
      hasAvatar: !!updatedUser?.avatar_url,
      avatarLength: updatedUser?.avatar_url?.length
    });

    return NextResponse.json({
      success: true,
      message: 'Аватар обновлен',
      avatar: updatedUser?.avatar_url
    });

  } catch (error: any) {
    console.error('Avatar API error:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ошибка при обновлении аватара',
        details: error.message
      },
      { status: 500 }
    );
  }
}