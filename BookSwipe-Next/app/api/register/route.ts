import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Заполните все поля' },
        { status: 400 }
      );
    }

    const existingUser = dbHelpers.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Пользователь уже существует' },
        { status: 409 }
      );
    }

    dbHelpers.addUser(email, password, name, '/img/ava.jpg');

    return NextResponse.json({
      success: true,
      message: 'Пользователь создан'
    });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}
