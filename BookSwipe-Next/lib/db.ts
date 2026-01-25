import path from 'path';

const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'BookSwipe.db');

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
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

  addUser: (email: string, password: string, name?: string) => {
      try {
        const stmt = db.prepare(`
          INSERT INTO users (email, password, name)
          VALUES (?, ?, ?)
        `);
        return stmt.run(email, password, name || '');
      } catch (error) {
        console.error('Error adding user:', error);
        throw error;
      }
    },

    getUserByEmail: (email: string) => {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      return stmt.get(email);
    },

    getAllUsers: () => {
      return db.prepare('SELECT * FROM users').all();
    }
  };
