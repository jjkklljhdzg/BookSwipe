import path from 'path';

const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'BookSwipe.db');

export const db = new Database(dbPath, {
  readonly: true,
});
