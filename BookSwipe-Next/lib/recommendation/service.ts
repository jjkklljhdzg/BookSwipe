import { DeepSeekService } from './deepseek';
import { db } from '@/lib/db';

// Типы для книг
interface BookData {
  id: number;
  title: string;
  author: string;
  genres: string;
}

export class RecommendationService {
  private deepseekService: DeepSeekService;

  constructor() {
    this.deepseekService = new DeepSeekService();
  }

  async getUserRecommendations(userId: number, limit: number = 8): Promise<number[]> {
    try {
      console.log('Получаем рекомендации для пользователя ID:', userId);
      
      // Получаем взаимодействия пользователя
      const [likedBooks, dislikedBooks, readBooks, allBooks] = await Promise.all([
        this.getUserLikedBooks(userId),
        this.getUserDislikedBooks(userId),
        this.getUserReadBooks(userId),
        this.getAllAvailableBooks(userId)
      ]);

      console.log('Взаимодействия пользователя:', {
        лайков: likedBooks.length,
        дизлайков: dislikedBooks.length,
        прочитано: readBooks.length,
        доступно: allBooks.length
      });

      //Учитываем ВСЕ взаимодействия
      const totalInteractions = likedBooks.length + dislikedBooks.length + readBooks.length;
      
      // Если есть хоть какие-то взаимодействия (даже только дизлайки)
      if (totalInteractions >= 1) {
        console.log('Используем взаимодействия для рекомендаций');
        
        // Передаем дизлайки в DeepSeek
        const recommendations = await this.deepseekService.getRecommendations(
          likedBooks,
          dislikedBooks, // Теперь передаем дизлайки
          readBooks,
          allBooks
        );

        console.log('Рекомендации от DeepSeek:', recommendations);

        // Если DeepSeek не вернул рекомендации, используем fallback
        if (recommendations.length === 0) {
          return this.getFallbackRecommendations(likedBooks, dislikedBooks, readBooks, allBooks, limit);
        }

        return recommendations.slice(0, limit);
      }

      // Если нет данных, возвращаем популярные книги (исключая дизлайки)
      console.log('Мало данных, используем популярные книги');
      return this.getPopularBooks(limit, userId);
    } catch (error) {
      console.error('Ошибка в сервисе рекомендаций:', error);
      return this.getPopularBooks(limit, userId);
    }
  }

  private async getUserLikedBooks(userId: number): Promise<BookData[]> {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT b.id, b.title, b.author, b.genres 
        FROM Book b
        JOIN Swipe s ON b.id = s.book_id
        WHERE s.user_id = ? AND s.type = 'like'
        ORDER BY s.created_at DESC
        LIMIT 20
      `);
      const books = stmt.all(userId) as BookData[];
      return books;
    } catch (error) {
      console.error('Ошибка получения лайков:', error);
      return [];
    }
  }

  private async getUserDislikedBooks(userId: number): Promise<BookData[]> {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT b.id, b.title, b.author, b.genres 
        FROM Book b
        JOIN Swipe s ON b.id = s.book_id
        WHERE s.user_id = ? AND s.type = 'dislike'
        ORDER BY s.created_at DESC
        LIMIT 20
      `);
      const books = stmt.all(userId) as BookData[];
      return books;
    } catch (error) {
      console.error('Ошибка получения дизлайков:', error);
      return [];
    }
  }

  private async getUserReadBooks(userId: number): Promise<BookData[]> {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT b.id, b.title, b.author, b.genres 
        FROM Book b
        JOIN Collection c ON b.id = c.book_id
        WHERE c.user_id = ? AND c.collection_type = 'read'
        ORDER BY c.created_at DESC
        LIMIT 20
      `);
      const books = stmt.all(userId) as BookData[];
      return books;
    } catch (error) {
      console.error('Ошибка получения прочитанных книг:', error);
      return [];
    }
  }

  private async getAllAvailableBooks(userId: number): Promise<BookData[]> {
    try {
      // Исключаем книги, которые пользователь уже дизлайкнул
      const stmt = db.prepare(`
        SELECT b.id, b.title, b.author, b.genres 
        FROM Book b
        WHERE b.id NOT IN (
          SELECT book_id FROM Swipe WHERE user_id = ? AND type = 'dislike'
          UNION
          SELECT book_id FROM Collection WHERE user_id = ? AND collection_type = 'read'
        )
        ORDER BY RANDOM()
        LIMIT 50
      `);
      const books = stmt.all(userId, userId) as BookData[];
      return books;
    } catch (error) {
      console.error('Ошибка получения доступных книг:', error);
      
      // В случае ошибки возвращаем все книги (кроме дизлайков)
      const stmt = db.prepare(`
        SELECT id, title, author, genres 
        FROM Book 
        WHERE id NOT IN (SELECT book_id FROM Swipe WHERE user_id = ? AND type = 'dislike')
        ORDER BY RANDOM() 
        LIMIT 50
      `);
      const books = stmt.all(userId) as BookData[];
      return books;
    }
  }

  private async getPopularBooks(limit: number, userId?: number): Promise<number[]> {
    try {
      let query = `
        SELECT b.id, COUNT(s.book_id) as like_count
        FROM Book b
        LEFT JOIN Swipe s ON b.id = s.book_id AND s.type = 'like'
      `;
      
      const params: any[] = [];
      
      //Исключаем книги, которые пользователь дизлайкнул
      if (userId) {
        query += `
          WHERE b.id NOT IN (
            SELECT book_id FROM Swipe 
            WHERE user_id = ? AND type = 'dislike'
          )
        `;
        params.push(userId);
      }
      
      query += `
        GROUP BY b.id
        ORDER BY like_count DESC
        LIMIT ?
      `;
      params.push(limit);
      
      const stmt = db.prepare(query);
      const popular = stmt.all(...params) as {id: number, like_count: number}[];
      
      // Если результат пустой (все популярные книги дизлайкнуты), показываем случайные
      if (popular.length === 0) {
        console.log('Все популярные книги дизлайкнуты, показываем случайные');
        return this.getRandomBooks(limit, userId);
      }
      
      return popular.map(b => b.id);
    } catch (error) {
      console.error('Ошибка получения популярных книг:', error);
      return this.getRandomBooks(limit, userId);
    }
  }

  private async getRandomBooks(limit: number, userId?: number): Promise<number[]> {
    try {
      let query = 'SELECT id FROM Book';
      const params: any[] = [];
      
      //Исключаем дизлайкнутые книги
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
      console.error('Ошибка получения случайных книг:', error);
      return [];
    }
  }

  private async getFallbackRecommendations(
    likedBooks: BookData[],
    dislikedBooks: BookData[],
    readBooks: BookData[],
    availableBooks: BookData[],
    limit: number
  ): Promise<number[]> {
    // Объединяем лайки и прочитанные книги
    const allPreferences = [...likedBooks, ...readBooks];
    
    if (allPreferences.length === 0 && dislikedBooks.length === 0) {
      return this.getPopularBooks(limit);
    }

    // Анализируем жанры из ЛАЙКОВ и ПРОЧИТАННЫХ
    const likedGenreFrequency: Record<string, number> = {};
    
    allPreferences.forEach(book => {
      const genres = book.genres.split(',').map(g => g.trim());
      genres.forEach(genre => {
        if (genre) {
          likedGenreFrequency[genre] = (likedGenreFrequency[genre] || 0) + 1;
        }
      });
    });

    // Анализируем жанры из ДИЗЛАЙКОВ (чтобы их избегать)
    const dislikedGenres: Set<string> = new Set();
    
    dislikedBooks.forEach(book => {
      const genres = book.genres.split(',').map(g => g.trim());
      genres.forEach(genre => {
        if (genre) {
          dislikedGenres.add(genre);
        }
      });
    });

    const sortedLikedGenres = Object.entries(likedGenreFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    // Оцениваем книги
    const scoredBooks = availableBooks.map(book => {
      const bookGenres = book.genres.split(',').map(g => g.trim());
      let score = 0;
      
      // Бонус за жанры из лайков
      bookGenres.forEach(genre => {
        const index = sortedLikedGenres.indexOf(genre);
        if (index !== -1) {
          score += (sortedLikedGenres.length - index) * 2;
        }
      });
      
      // Штраф за жанры из дизлайков
      bookGenres.forEach(genre => {
        if (dislikedGenres.has(genre)) {
          score -= 10; // Большой штраф за дизлайки
        }
      });
      
      // Максимальный штраф, если книга уже была дизлайкнута
      if (dislikedBooks.some(disliked => disliked.id === book.id)) {
        score = -1000;
      }
      
      return { id: book.id, score };
    });

    scoredBooks.sort((a, b) => b.score - a.score);
    
    // Фильтруем книги с положительным счетом
    const positiveScoredBooks = scoredBooks.filter(b => b.score > 0);
    
    if (positiveScoredBooks.length >= limit) {
      return positiveScoredBooks.slice(0, limit).map(b => b.id);
    }
    
    // Если мало положительных рекомендаций, возвращаем лучшие из всех
    return scoredBooks.slice(0, limit).map(b => b.id);
  }

  async getUserByEmail(email: string): Promise<{ id: number; name: string } | null> {
    try {
      const stmt = db.prepare('SELECT id, nickname as name FROM User WHERE email = ?');
      const user = stmt.get(email) as {id: number, name: string} | undefined;
      return user || null;
    } catch (error) {
      console.error('Ошибка получения пользователя по email:', error);
      return null;
    }
  }

  //Получение статистики взаимодействий
  async getUserInteractions(userId: number): Promise<{
    likes: number;
    dislikes: number;
    read: number;
  }> {
    try {
      const likesStmt = db.prepare(`
        SELECT COUNT(*) as count FROM Swipe 
        WHERE user_id = ? AND type = 'like'
      `);
      
      const dislikesStmt = db.prepare(`
        SELECT COUNT(*) as count FROM Swipe 
        WHERE user_id = ? AND type = 'dislike'
      `);
      
      const readStmt = db.prepare(`
        SELECT COUNT(*) as count FROM Collection 
        WHERE user_id = ? AND collection_type = 'read'
      `);
      
      const likes = (likesStmt.get(userId) as {count: number}).count;
      const dislikes = (dislikesStmt.get(userId) as {count: number}).count;
      const read = (readStmt.get(userId) as {count: number}).count;
      
      return { likes, dislikes, read };
    } catch (error) {
      console.error('Error getting user interactions:', error);
      return { likes: 0, dislikes: 0, read: 0 };
    }
  }

}
