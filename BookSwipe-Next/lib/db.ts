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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    return stmt.run(email, password, name || '', avatar || '/img/ava.jpg');
  },

  getUserByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM User WHERE email = ?');
    return stmt.get(email);
  },

  // Адаптированная версия из старого рабочего кода (users -> User)
  updateUserAvatar: (email: string, avatar: string) => {
    const stmt = db.prepare(`
      UPDATE User
      SET avatar_url = ?
      WHERE email = ?
    `);
    return stmt.run(avatar, email);
  },

  // Адаптированная версия из старого рабочего кода (users -> User)
  updateUserProfile: (email: string, data: { name?: string, avatar?: string }) => {
    const { name, avatar } = data;
    if (name && avatar) {
      const stmt = db.prepare(`
        UPDATE User
        SET nickname = ?, avatar_url = ?
        WHERE email = ?
      `);
      return stmt.run(name, avatar, email);
    } else if (name) {
      const stmt = db.prepare(`
        UPDATE User
        SET nickname = ?
        WHERE email = ?
      `);
      return stmt.run(name, email);
    } else if (avatar) {
      const stmt = db.prepare(`
        UPDATE User
        SET avatar_url = ?
        WHERE email = ?
      `);
      return stmt.run(avatar, email);
    }
    return { changes: 0 };
  },

  getAllUsers: () => {
    return db.prepare('SELECT * FROM User').all();
  }
};