import { NextRequest, NextResponse } from 'next/server';
import { RecommendationService } from '@/lib/recommendation/service';

// Отключаем кэширование
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Кэшируем сервис
let recommendationService: RecommendationService | null = null;

function getRecommendationService(): RecommendationService {
  if (!recommendationService) {
    recommendationService = new RecommendationService();
  }
  return recommendationService;
}

// Вспомогательная функция для получения случайных книг
async function getRandomBooks(limit: number, userId?: number): Promise<number[]> {
  const service = getRecommendationService();
  
  // Создаем временный объект для вызова приватного метода
  // В реальном коде нужно добавить публичный метод в service
  try {
    // Используем прямой SQL запрос
    const { db } = require('@/lib/db');
    
    let query = 'SELECT id FROM Book';
    const params: any[] = [];
    
    // Исключаем дизлайкнутые книги
    if (userId) {
      query += ' WHERE id NOT IN (SELECT book_id FROM Swipe WHERE user_id = ? AND type = "dislike")';
      params.push(userId);
    }
    
    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(limit);
    
    const stmt = db.prepare(query);
    const random = stmt.all(...params) as {id: number}[];
    return random.map(b => b.id);
  } catch (error) {
    console.error('Error getting random books:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const limit = parseInt(searchParams.get('limit') || '8');

    console.log('API рекомендаций вызван с параметрами:', { userId, email, limit });

    const service = getRecommendationService();
    let recommendations: number[] = [];

    if (userId) {
      const userIdNum = parseInt(userId);
      
      // Получаем статистику взаимодействий
      const interactions = await service.getUserInteractions(userIdNum);
      console.log('Статистика взаимодействий:', {
        likes: interactions.likes,
        dislikes: interactions.dislikes,
        read: interactions.read,
        total: interactions.likes + interactions.dislikes + interactions.read
      });
      
      // Генерируем рекомендации с учетом ВСЕХ взаимодействий
      recommendations = await service.getUserRecommendations(userIdNum, limit);
      
      console.log('Итоговые рекомендации:', recommendations.length > 0 ? recommendations : 'пусто');
      
      // Если рекомендации пустые (все дизлайкнуты), возвращаем случайные
      if (recommendations.length === 0) {
        console.log('Рекомендации пустые, возвращаем случайные книги (исключая дизлайки)');
        recommendations = await getRandomBooks(limit, userIdNum);
      }
      
    } else if (email) {
      // Получаем userId по email
      const user = await service.getUserByEmail(email);
      if (user) {
        recommendations = await service.getUserRecommendations(user.id, limit);
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Пользователь не найден'
          },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Требуется userId или email'
        },
        { status: 400 }
      );
    }

    console.log('Возвращаем рекомендации:', recommendations);

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
      message: recommendations.length > 0 ? 'Рекомендации сгенерированы' : 'Нет данных для рекомендаций'
    });
  } catch (error) {
    console.error('Ошибка API рекомендаций:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Внутренняя ошибка сервера'
      },
      { status: 500 }
    );
  }
}