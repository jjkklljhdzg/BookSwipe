// запускать node scripts/update-db.js. после использования рекомендую снести файл с репозитория.
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'BookSwipe.db');

try {
  console.log('Обновляем базу данных...');
  const db = new Database(dbPath);

  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasAvatar = tableInfo.some(col => col.name === 'avatar');

  if (!hasAvatar) {
    console.log('Добавляем поле avatar в таблицу users...');

    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        avatar TEXT DEFAULT '/img/ava.jpg',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      INSERT INTO users_new (id, email, password, name, created_at)
      SELECT id, email, password, name, created_at FROM users
    `);

    db.exec('DROP TABLE users');

    db.exec('ALTER TABLE users_new RENAME TO users');

    console.log('Поле avatar успешно добавлено.');

    const users = db.prepare('SELECT * FROM users').all();
    console.log(`Обновлено ${users.length} пользователей`);

  } else {
    console.log('Поле avatar уже существует в таблице users');
  }

  const updatedTableInfo = db.prepare("PRAGMA table_info(users)").all();
  console.log('\nСтруктура таблицы users:');
  updatedTableInfo.forEach(col => {
    console.log(`  ${col.name} (${col.type})`);
  });

  db.close();
  console.log('\nБаза данных обновлена.');

} catch (error) {
  console.error('Ошибка:', error.message);
}
