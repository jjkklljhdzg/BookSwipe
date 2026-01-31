// lib/db.ts
import path from 'path';

const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'BookSwipe.db');
export const db = new Database(dbPath);

// СОЗДАЕМ ТАБЛИЦУ User
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    avatar_url TEXT DEFAULT '/img/ava.jpg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// СОЗДАЕМ ТАБЛИЦУ Book (если её еще нет)
db.exec(`
  CREATE TABLE IF NOT EXISTS Book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genres TEXT,
    published_at TEXT,
    annotation TEXT,
    series_title TEXT,
    series_number INTEGER,
    cover_url TEXT,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// СОЗДАЕМ ТАБЛИЦУ Review
db.exec(`
  CREATE TABLE IF NOT EXISTS Review (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES Book(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
  )
`);
db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_book_stats 
  AFTER INSERT ON Review
  BEGIN
    UPDATE Book
    SET 
      rating = (
        SELECT AVG(rating) 
        FROM Review 
        WHERE book_id = NEW.book_id
      ),
      review_count = (
        SELECT COUNT(*) 
        FROM Review 
        WHERE book_id = NEW.book_id
      )
    WHERE id = NEW.book_id;
  END
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_book_stats_update 
  AFTER UPDATE ON Review
  BEGIN
    UPDATE Book
    SET 
      rating = (
        SELECT AVG(rating) 
        FROM Review 
        WHERE book_id = NEW.book_id
      ),
      review_count = (
        SELECT COUNT(*) 
        FROM Review 
        WHERE book_id = NEW.book_id
      )
    WHERE id = NEW.book_id;
  END
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_book_stats_delete 
  AFTER DELETE ON Review
  BEGIN
    UPDATE Book
    SET 
      rating = (
        SELECT AVG(rating) 
        FROM Review 
        WHERE book_id = OLD.book_id
      ),
      review_count = (
        SELECT COUNT(*) 
        FROM Review 
        WHERE book_id = OLD.book_id
      )
    WHERE id = OLD.book_id;
  END
`);

// СОЗДАЕМ ТАБЛИЦУ Swipe для свайпов (лайков/дизлайков)
db.exec(`
  CREATE TABLE IF NOT EXISTS Swipe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'dislike')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES Book(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
  )
`);

// СОЗДАЕМ ТАБЛИЦУ Collection для коллекций пользователя
db.exec(`
  CREATE TABLE IF NOT EXISTS Collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    collection_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES Book(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
  )
`);

// ДОБАВЛЯЕМ ОТСУТСТВУЮЩИЕ КОЛОНКИ ЕСЛИ НУЖНО
try {
  const columns = db.prepare("PRAGMA table_info(Book)").all();
  const hasRating = columns.some((col: any) => col.name === 'rating');
  
  if (!hasRating) {
    db.exec(`ALTER TABLE Book ADD COLUMN rating REAL DEFAULT 0`);
  }
  
  const hasReviewCount = columns.some((col: any) => col.name === 'review_count');
  if (!hasReviewCount) {
    db.exec(`ALTER TABLE Book ADD COLUMN review_count INTEGER DEFAULT 0`);
  }
} catch (error) {
  // Тихая обработка ошибок
}



// Вспомогательные функции для работы с БД
export const dbHelpers = {
  getBooks: () => {
    return db.prepare(`
      SELECT
        b.id,
        b.title,
        b.author,
        b.genres,
        b.published_at as publishedAt,
        b.annotation,
        b.series_title as seriesTitle,
        b.series_number as seriesNumber,
        b.cover_url as coverUrl,
        b.created_at as createdAt,
        b.rating,
        b.review_count as reviewCount
      FROM Book b
      ORDER BY b.created_at DESC
    `).all();
  },

  getBookById: (bookId: number) => {
    try {
      return db.prepare(`
        SELECT
          b.id,
          b.title,
          b.author,
          b.genres,
          b.published_at as publishedAt,
          b.annotation,
          b.series_title as seriesTitle,
          b.series_number as seriesNumber,
          b.cover_url as coverUrl,
          b.created_at as createdAt,
          b.rating,
          b.review_count as reviewCount
        FROM Book b
        WHERE b.id = ?
      `).get(bookId);
    } catch (error) {
      return null;
    }
  },

  searchBooks: (query: string) => {
    const searchTerm = `%${query}%`;
    return db.prepare(`
      SELECT
        b.id,
        b.title,
        b.author,
        b.genres,
        b.cover_url as coverUrl,
        b.rating,
        b.review_count as reviewCount
      FROM Book b
      WHERE b.title LIKE ? OR b.author LIKE ? OR b.genres LIKE ?
      ORDER BY b.rating DESC
      LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm);
  },

  // Функции для работы с пользователями
  addUser: (email: string, password: string, name?: string, avatar?: string) => {
    const stmt = db.prepare(`
      INSERT INTO User (email, password_hash, nickname, avatar_url)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(email, password, name || email.split('@')[0], avatar || '/img/ava.jpg');
  },

  getUserByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM User WHERE email = ?');
    return stmt.get(email);
  },

  getOrCreateUser: function(email: string) {
    try {
      const stmt = db.prepare('SELECT id FROM User WHERE email = ?');
      const existingUser = stmt.get(email);
      
      if (existingUser) {
        return existingUser;
      }
      
      const insertStmt = db.prepare(`
        INSERT INTO User (email, password_hash, nickname, avatar_url) 
        VALUES (?, ?, ?, ?)
      `);
      
      const defaultPassword = 'default_password_' + Date.now();
      const result = insertStmt.run(
        email,
        defaultPassword,
        email.split('@')[0],
        '/img/ava.jpg'
      );
      
      return { id: result.lastInsertRowid };
    } catch (error) {
      throw error;
    }
  },

  getUserProfile: (email: string) => {
    try {
      const stmt = db.prepare(`
        SELECT 
          id,
          email,
          nickname as name,
          avatar_url as avatar
        FROM User 
        WHERE email = ?
      `);
      return stmt.get(email);
    } catch (error) {
      throw error;
    }
  },

  updateUserProfile: (email: string, data: { name?: string, avatar?: string }) => {
    try {
      const { name, avatar } = data;
      
      let query = 'UPDATE User SET ';
      const params: any[] = [];
      
      if (name && avatar) {
        query += 'nickname = ?, avatar_url = ? ';
        params.push(name, avatar);
      } else if (name) {
        query += 'nickname = ? ';
        params.push(name);
      } else if (avatar) {
        query += 'avatar_url = ? ';
        params.push(avatar);
      } else {
        return { changes: 0 };
      }
      
      query += 'WHERE email = ?';
      params.push(email);
      
      const stmt = db.prepare(query);
      return stmt.run(...params);
    } catch (error) {
      throw error;
    }
  },

  getAllUsers: () => {
    return db.prepare('SELECT * FROM User').all();
  },

  // Функции для работы с отзывами
  addReview: (userId: number, bookId: number, rating: number, text: string) => {
    try {
      // Сначала проверяем, есть ли уже отзыв от этого пользователя
      const existing = db.prepare(`
        SELECT id FROM Review 
        WHERE user_id = ? AND book_id = ?
      `).get(userId, bookId);

      if (existing) {
        // Обновляем существующий отзыв
        const stmt = db.prepare(`
          UPDATE Review 
          SET rating = ?, text = ?, created_at = ?
          WHERE id = ?
        `);
        return stmt.run(rating, text, new Date().toISOString(), existing.id);
      } else {
        // Создаем новый отзыв
        const stmt = db.prepare(`
          INSERT INTO Review (user_id, book_id, rating, text, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(userId, bookId, rating, text, new Date().toISOString());
      }
    } catch (error) {
      throw error;
    }
  },

  getBookReviews: (bookId: number) => {
    try {
      return db.prepare(`
        SELECT 
          r.id,
          r.user_id as userId,
          r.rating,
          r.text,
          r.created_at as createdAt,
          u.nickname as userName,
          u.avatar_url as userAvatar
        FROM Review r
        LEFT JOIN User u ON r.user_id = u.id
        WHERE r.book_id = ?
        ORDER BY r.created_at DESC
      `).all(bookId);
    } catch (error) {
      return [];
    }
  },

  getUserReview: (userId: number, bookId: number) => {
    try {
      return db.prepare(`
        SELECT 
          r.id,
          r.rating,
          r.text,
          r.created_at
        FROM Review r
        WHERE r.user_id = ? AND r.book_id = ?
      `).get(userId, bookId);
    } catch (error) {
      return null;
    }
  },

  getUserReviews: (userId: number) => {
    try {
      return db.prepare(`
        SELECT 
          r.id,
          r.rating,
          r.text,
          r.created_at,
          b.id as bookId,
          b.title as bookTitle,
          b.author as bookAuthor,
          b.cover_url as bookImage
        FROM Review r
        JOIN Book b ON r.book_id = b.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `).all(userId);
    } catch (error) {
      return [];
    }
  },

  deleteReview: (reviewId: number) => {
    try {
      return db.prepare(`
        DELETE FROM Review WHERE id = ?
      `).run(reviewId);
    } catch (error) {
      throw error;
    }
  },

  // Функции для работы со свайпами
  addSwipe: (userId: number, bookId: number, type: 'like' | 'dislike') => {
    try {
      db.prepare('DELETE FROM Swipe WHERE user_id = ? AND book_id = ?').run(userId, bookId);
      
      const stmt = db.prepare(`
        INSERT INTO Swipe (user_id, book_id, type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      return stmt.run(userId, bookId, type, new Date().toISOString());
    } catch (error) {
      throw error;
    }
  },

  getUserSwipes: (userId: number) => {
    return db.prepare(`
      SELECT s.*, b.title, b.author, b.genres
      FROM Swipe s
      JOIN Book b ON s.book_id = b.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(userId);
  },

  getUserLikes: (userId: number) => {
    return db.prepare(`
      SELECT b.* 
      FROM Book b
      JOIN Swipe s ON b.id = s.book_id
      WHERE s.user_id = ? AND s.type = 'like'
      ORDER BY s.created_at DESC
    `).all(userId);
  },

  getUserDislikes: (userId: number) => {
    return db.prepare(`
      SELECT b.* 
      FROM Book b
      JOIN Swipe s ON b.id = s.book_id
      WHERE s.user_id = ? AND s.type = 'dislike'
      ORDER BY s.created_at DESC
    `).all(userId);
  },

  // Функции для работы с коллекциями
  addToCollection: (userId: number, bookId: number, collectionType: string) => {
    try {
      db.prepare('DELETE FROM Collection WHERE user_id = ? AND book_id = ?').run(userId, bookId);
      
      const stmt = db.prepare(`
        INSERT INTO Collection (user_id, book_id, collection_type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      return stmt.run(userId, bookId, collectionType, new Date().toISOString());
    } catch (error) {
      throw error;
    }
  },

  getUserCollection: (userId: number, collectionType?: string) => {
    try {
      if (collectionType) {
        return db.prepare(`
          SELECT 
            c.id,
            c.book_id,
            c.collection_type,
            c.created_at,
            b.title,
            b.author,
            b.cover_url,
            b.genres,
            b.rating
          FROM Collection c
          JOIN Book b ON c.book_id = b.id
          WHERE c.user_id = ? AND c.collection_type = ?
          ORDER BY c.created_at DESC
        `).all(userId, collectionType);
      } else {
        return db.prepare(`
          SELECT 
            c.id,
            c.book_id,
            c.collection_type,
            c.created_at,
            b.title,
            b.author,
            b.cover_url,
            b.genres,
            b.rating
          FROM Collection c
          JOIN Book b ON c.book_id = b.id
          WHERE c.user_id = ?
          ORDER BY c.created_at DESC
        `).all(userId);
      }
    } catch (error) {
      return [];
    }
  },

  removeFromCollection: (userId: number, bookId: number) => {
    return db.prepare(`
      DELETE FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).run(userId, bookId);
  },

  checkBookInCollection: (userId: number, bookId: number) => {
    return db.prepare(`
      SELECT collection_type 
      FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId);
  }
};