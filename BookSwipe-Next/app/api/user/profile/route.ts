import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

// Получение профиля (GET метод)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    console.log('GET /api/user/profile - email:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email обязателен' },
        { status: 400 }
      );
    }

    const user = dbHelpers.getUserProfile(email);
    console.log('GET - Found user:', user);

    if (!user) {
      // Создаем пользователя если не существует
      try {
        const result = dbHelpers.addUser(
          email,
          'temp_password_' + Date.now(),
          email.split('@')[0],
          '/img/ava.jpg'
        );
        
        const newUser = dbHelpers.getUserProfile(email);
        console.log('Created new user:', newUser);
        
        return NextResponse.json({
          success: true,
          user: {
            id: newUser.id,
            name: newUser.name || email.split('@')[0],
            avatar: newUser.avatar || '/img/ava.jpg',
            email: newUser.email
          }
        });
      } catch (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { success: false, message: 'Пользователь не найден' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('GET Profile error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ошибка при получении профиля',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Обновление профиля (PUT метод)
export async function PUT(request: Request) {
  try {
    const { email, name, avatar } = await request.json();

    console.log('PUT /api/user/profile:', { email, name, hasAvatar: !!avatar });

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email обязателен' },
        { status: 400 }
      );
    }

    // Обновляем профиль в БД
    const result = dbHelpers.updateUserProfile(email, { name, avatar });
    console.log('PUT - Update result:', result);

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, message: 'Данные не изменились или пользователь не найден' },
        { status: 400 }
      );
    }

    // Получаем обновленные данные пользователя
    const updatedUser = dbHelpers.getUserProfile(email);
    console.log('PUT - Updated user:', updatedUser);

    return NextResponse.json({
      success: true,
      message: 'Профиль успешно обновлен',
      user: {
        id: updatedUser?.id,
        name: updatedUser?.name,
        avatar: updatedUser?.avatar,
        email: updatedUser?.email
      }
    });

  } catch (error: any) {
    console.error('PUT Profile error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Ошибка при обновлении профиля',
        error: error.message 
      },
      { status: 500 }
    );
  }
}