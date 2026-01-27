export class DeepSeekService {
  private apiKey: string;
  private baseURL = 'https://api.sambanova.ai/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '50faccdb-c985-4475-8ca5-314930c1b002';
  }

  async getRecommendations(
    likedBooks: {title: string, author: string, genres: string}[],
    dislikedBooks: {title: string, author: string, genres: string}[], // 🔥 Добавлен параметр
    readBooks: {title: string, author: string, genres: string}[],
    availableBooks: {id: number, title: string, author: string, genres: string}[]
  ): Promise<number[]> {
    
    // 🔥 Теперь учитываем и дизлайки
    if (likedBooks.length === 0 && dislikedBooks.length === 0 && readBooks.length === 0) {
      return [];
    }

    const prompt = this.buildPrompt(likedBooks, dislikedBooks, readBooks, availableBooks);
    
    try {
      console.log('Отправляем запрос к DeepSeek API...');
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'DeepSeek-V3-0324',
          messages: [
            {
              role: 'system',
              content: `Ты - эксперт по книгам. Анализируй предпочтения пользователя:
              1. Книги в разделе "ПОНРАВИВШИЕСЯ" - это то, что пользователю нравится
              2. Книги в разделе "НЕПОНРАВИВШИЕСЯ" - это то, что пользователю НЕ нравится (ВАЖНО избегать подобного!)
              3. Книги в разделе "ПРОЧИТАННЫЕ" - это то, что пользователь уже прочитал
              
              Рекомендуй книги, которые похожи на понравившиеся, но НЕ похожи на непонравившиеся.
              Особенно избегай жанров и авторов из непонравившихся книг.
              
              Верни ТОЛЬКО ID рекомендованных книг через запятую.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        console.error('Ошибка API:', response.status, response.statusText);
        return this.getFallbackRecommendations(likedBooks, dislikedBooks, availableBooks);
      }

      const data = await response.json();
      
      const content = data.choices[0]?.message?.content || '';
      const recommendations = this.parseResponse(content);
      
      return recommendations;
    } catch (error) {
      console.error('Ошибка получения рекомендаций:', error);
      return this.getFallbackRecommendations(likedBooks, dislikedBooks, availableBooks);
    }
  }

  private buildPrompt(
    liked: {title: string, author: string, genres: string}[],
    disliked: {title: string, author: string, genres: string}[],
    read: {title: string, author: string, genres: string}[],
    available: {id: number, title: string, author: string, genres: string}[]
  ): string {
    let prompt = '';

    if (liked.length > 0) {
      prompt += `ПОНРАВИВШИЕСЯ КНИГИ:\n${liked.map(b => `- "${b.title}" (${b.author}) - Жанры: ${b.genres}`).join('\n')}\n\n`;
    }

    if (disliked.length > 0) {
      prompt += `НЕПОНРАВИВШИЕСЯ КНИГИ (ВАЖНО ИЗБЕГАТЬ ПОДОБНОГО):\n${disliked.map(b => `- "${b.title}" (${b.author}) - Жанры: ${b.genres}`).join('\n')}\n\n`;
    }

    if (read.length > 0) {
      prompt += `ПРОЧИТАННЫЕ КНИГИ:\n${read.map(b => `- "${b.title}" (${b.author}) - Жанры: ${b.genres}`).join('\n')}\n\n`;
    }

    prompt += `ДОСТУПНЫЕ КНИГИ (ID - Название - Автор - Жанры):\n${available.map(b => `${b.id}. "${b.title}" - ${b.author} (${b.genres})`).join('\n')}\n\n`;

    prompt += `Проанализируй предпочтения пользователя и рекомендую 8 книг из доступных, которые:
    1. Подходят по жанрам/авторам из понравившихся книг
    2. НЕ содержат жанров/авторов из непонравившихся книг (это очень важно!)
    3. Разнообразны и интересны
    
    Верни ТОЛЬКО ID рекомендованных книг через запятую. Например: "15,7,23,42,8,12,31,19"
    Рекомендации:`;

    return prompt;
  }

  private parseResponse(content: string): number[] {
    // Ищем последовательности чисел
    const numberPattern = /\b\d+\b/g;
    const numbers = content.match(numberPattern);
    
    if (!numbers) {
      return [];
    }
    
    // Преобразуем в числа и фильтруем
    const result = numbers
      .map(num => parseInt(num, 10))
      .filter(num => !isNaN(num) && num > 0)
      .slice(0, 8);
    
    return result;
  }

  private getFallbackRecommendations(
    likedBooks: {genres: string}[],
    dislikedBooks: {genres: string}[],
    availableBooks: {id: number, genres: string}[]
  ): number[] {
    if (availableBooks.length === 0) return [];
    
    // Простой алгоритм на основе жанров
    const likedGenreFrequency: Record<string, number> = {};
    const dislikedGenres: Set<string> = new Set();
    
    // Анализируем лайки
    likedBooks.forEach(book => {
      const genres = book.genres.split(',').map(g => g.trim());
      genres.forEach(genre => {
        if (genre) {
          likedGenreFrequency[genre] = (likedGenreFrequency[genre] || 0) + 1;
        }
      });
    });

    // Анализируем дизлайки
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
      
      // Бонус за лайки
      bookGenres.forEach(genre => {
        const index = sortedLikedGenres.indexOf(genre);
        if (index !== -1) {
          score += (sortedLikedGenres.length - index);
        }
      });
      
      // Штраф за дизлайки
      bookGenres.forEach(genre => {
        if (dislikedGenres.has(genre)) {
          score -= 10;
        }
      });
      
      return { id: book.id, score };
    });

    scoredBooks.sort((a, b) => b.score - a.score);
    
    return scoredBooks.slice(0, 8).map(b => b.id);
  }
}