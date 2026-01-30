// lib/db.ts
import path from 'path';

const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'BookSwipe.db');
export const db = new Database(dbPath);

// СОЗДАЕМ ТАБЛИЦУ User с правильной структурой
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

// ДОБАВЛЯЕМ ОТСУТСТВУЮЩИЕ КОЛОНКИ ЕСЛИ НУЖНО
try {
  const columns = db.prepare("PRAGMA table_info(User)").all();
  const hasUpdatedAt = columns.some((col: any) => col.name === 'updated_at');
  
  if (!hasUpdatedAt) {
    db.exec(`ALTER TABLE User ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  }
  
  const hasCreatedAt = columns.some((col: any) => col.name === 'created_at');
  if (!hasCreatedAt) {
    db.exec(`ALTER TABLE User ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  }
} catch (error) {
  // Тихая обработка ошибок
}

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
        COALESCE(AVG(r.rating), 0) as averageRating,
        COUNT(r.id) as reviewCount
      FROM Book b
      LEFT JOIN Review r ON b.id = r.book_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `).all();
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
        COALESCE(AVG(r.rating), 0) as averageRating,
        COUNT(r.id) as reviewCount
      FROM Book b
      LEFT JOIN Review r ON b.id = r.book_id
      WHERE b.title LIKE ? OR b.author LIKE ? OR b.genres LIKE ?
      GROUP BY b.id
      ORDER BY averageRating DESC
      LIMIT 10
    `).all(searchTerm, searchTerm, searchTerm);
  },

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

  // Функция для создания пользователя если его нет
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

  // Функция для получения профиля пользователя
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

  // Функция для обновления аватара
  updateUserAvatar: (email: string, avatar: string) => {
    try {
      const stmt = db.prepare(`
        UPDATE User 
        SET avatar_url = ?
        WHERE email = ?
      `);
      return stmt.run(avatar, email);
    } catch (error) {
      throw error;
    }
  },

  // Функция для обновления профиля
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

  // Проверить есть ли книга в коллекции пользователя
  checkBookInCollection: (userId: number, bookId: number) => {
    return db.prepare(`
      SELECT collection_type 
      FROM Collection 
      WHERE user_id = ? AND book_id = ?
    `).get(userId, bookId);
  }
};