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
      
      // Создаем нового пользователя
      const insertStmt = db.prepare(`
        INSERT INTO User (email, password_hash, nickname, avatar_url, created_at, updated_at) 
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      console.error('Error in getOrCreateUser:', error);
      throw error;
    }
  },

  updateUserAvatar: (email: string, avatar: string) => {
    const stmt = db.prepare(`
      UPDATE User
      SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `);
    return stmt.run(avatar, email);
  },

  updateUserProfile: (email: string, data: { name?: string, avatar?: string }) => {
    const { name, avatar } = data;
    if (name && avatar) {
      const stmt = db.prepare(`
        UPDATE User
        SET nickname = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `);
      return stmt.run(name, avatar, email);
    } else if (name) {
      const stmt = db.prepare(`
        UPDATE User
        SET nickname = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `);
      return stmt.run(name, email);
    } else if (avatar) {
      const stmt = db.prepare(`
        UPDATE User
        SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = ?
      `);
      return stmt.run(avatar, email);
    }
    return { changes: 0 };
  },

  getAllUsers: () => {
    return db.prepare('SELECT * FROM User').all();
  },

  // Функции для работы со свайпами
  addSwipe: (userId: number, bookId: number, type: 'like' | 'dislike') => {
    try {
      // Удаляем старый свайп если есть
      db.prepare('DELETE FROM Swipe WHERE user_id = ? AND book_id = ?').run(userId, bookId);
      
      // Добавляем новый
      const stmt = db.prepare(`
        INSERT INTO Swipe (user_id, book_id, type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      return stmt.run(userId, bookId, type, new Date().toISOString());
    } catch (error) {
      console.error('Error adding swipe:', error);
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
      // Удаляем старую запись если есть
      db.prepare('DELETE FROM Collection WHERE user_id = ? AND book_id = ?').run(userId, bookId);
      
      // Добавляем новую
      const stmt = db.prepare(`
        INSERT INTO Collection (user_id, book_id, collection_type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      return stmt.run(userId, bookId, collectionType, new Date().toISOString());
    } catch (error) {
      console.error('Error adding to collection:', error);
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
      console.error('Error getting user collection:', error);
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
  },

  // Функция для проверки существования таблиц
  checkTables: () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    console.log('Tables in database:');
    tables.forEach((table: any) => {
      console.log('-', table.name);
    });
    
    return tables;
  },

  // Функция для проверки данных в таблицах
  checkData: (userId: number) => {
    console.log(`\nChecking data for user ID: ${userId}`);
    
    // Проверяем пользователя
    const user = db.prepare('SELECT * FROM User WHERE id = ?').get(userId);
    console.log('User:', user);
    
    // Проверяем свайпы
    const swipes = db.prepare('SELECT * FROM Swipe WHERE user_id = ?').all(userId);
    console.log(`Swipe records: ${swipes.length}`);
    swipes.forEach((swipe: any, index: number) => {
      console.log(`  ${index + 1}. Book ${swipe.book_id}: ${swipe.type}`);
    });
    
    // Проверяем коллекцию
    const collection = db.prepare('SELECT * FROM Collection WHERE user_id = ?').all(userId);
    console.log(`Collection records: ${collection.length}`);
    collection.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. Book ${item.book_id}: ${item.collection_type}`);
    });
    
    return { user, swipes, collection };
  }
};