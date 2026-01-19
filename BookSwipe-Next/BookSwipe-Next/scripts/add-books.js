// scripts/import-from-json.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('Импорт книг в базу данных\n');

// Пути к файлам
const DB_PATH = path.join(__dirname, '..', 'BookSwipe.db');
const JSON_PATH = path.join(__dirname, '..', 'data', 'initial-books.json');

// Проверяем существование JSON файла
if (!fs.existsSync(JSON_PATH)) {
  console.error(`Файл не найден: ${JSON_PATH}`);
  console.error('Пожалуйста, создайте файл data/initial-books.json с книгами');
  process.exit(1);
}

// Проверяем существование базы данных и таблицы
if (!fs.existsSync(DB_PATH)) {
  console.error(`База данных не найдена: ${DB_PATH}`);
  console.error('Сначала создайте базу данных с таблицей Book');
  process.exit(1);
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ИМПОРТА ==========

async function importBooks() {
  console.log('Чтение JSON файла...');
  
  let books;
  try {
    const jsonData = fs.readFileSync(JSON_PATH, 'utf-8');
    books = JSON.parse(jsonData);
    console.log(`Прочитано ${books.length} книг из JSON\n`);
  } catch (error) {
    console.error(`Ошибка чтения JSON: ${error.message}`);
    process.exit(1);
  }
  
  // Подключаемся к базе данных
  const db = new Database(DB_PATH);
  
  // Проверяем существование таблицы Book
  try {
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='Book'
    `).get();
    
    if (!tableExists) {
      console.error('Таблица Book не существует в базе данных!');
      console.error('Пожалуйста, сначала создайте таблицу Book');
      db.close();
      process.exit(1);
    }
  } catch (error) {
    console.error(`Ошибка проверки таблицы: ${error.message}`);
    db.close();
    process.exit(1);
  }
  
  console.log('Таблица Book найдена, начинаем импорт...\n');
  
  // Подготавливаем SQL запросы
  const checkExistsStmt = db.prepare(`
    SELECT id FROM Book 
    WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) 
    AND LOWER(TRIM(author)) = LOWER(TRIM(?))
  `);
  
  const insertStmt = db.prepare(`
    INSERT INTO Book 
    (title, author, genres, published_at, annotation, series_title, series_number, cover_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Статистика
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log('Импортируем книги...\n');
  
  // Проходим по всем книгам
  books.forEach((book, index) => {
    const bookNumber = index + 1;
    
    try {
      // Проверяем обязательные поля
      if (!book.title || !book.author) {
        console.log(`[${bookNumber}] Пропущена: нет названия или автора`);
        skipped++;
        return;
      }
      
      // Проверяем дубликаты
      const existing = checkExistsStmt.get(book.title, book.author);
      if (existing) {
        console.log(`[${bookNumber}] Уже в базе: "${book.title}"`);
        skipped++;
        return;
      }
      
      // Подготавливаем данные
      const title = book.title.toString();
      const author = book.author.toString();
      const genres = book.genres || 'Художественная литература';
      const published_at = book.published_at || book.year || '0000';
      const annotation = book.annotation || book.description || '';
      const series_title = book.series_title || '';
      const series_number = book.series_number || 0;
      const cover_url = book.cover_url || '';
      
      // Вставляем в базу
      insertStmt.run(
        title,
        author,
        genres,
        published_at.toString(),
        annotation,
        series_title,
        series_number,
        cover_url
      );
      
      added++;
      console.log(`[${bookNumber}] Добавлена: "${title}" - ${author}`);
      
    } catch (error) {
      errors++;
      console.log(`[${bookNumber}] Ошибка: ${error.message}`);
      console.log(`Книга: ${JSON.stringify(book, null, 2)}`);
    }
  });
  
  // ========== ВЫВОД РЕЗУЛЬТАТОВ ==========
  
  console.log('\n' + '='.repeat(60));
  console.log('РЕЗУЛЬТАТЫ ИМПОРТА');
  console.log('='.repeat(60));
  
  // Получаем общую статистику
  const totalInDb = db.prepare('SELECT COUNT(*) as count FROM Book').get().count;
  
  console.log('Статистика:');
  console.log(`Всего в JSON: ${books.length} книг`);
  console.log(`Успешно добавлено: ${added} книг`);
  console.log(`Пропущено (дубликаты/ошибки): ${skipped} книг`);
  console.log(`Ошибок импорта: ${errors} книг`);
  console.log(`Всего в базе: ${totalInDb} книг`);
  
  // Показываем последние добавленные книги
  const recentBooks = db.prepare(`
    SELECT title, author, genres 
    FROM Book 
    ORDER BY id DESC 
    LIMIT 5
  `).all();
  
  if (recentBooks.length > 0) {
    console.log('\nПоследние добавленные книги:');
    recentBooks.forEach((book, i) => {
      console.log(`   ${i+1}. "${book.title}" - ${book.author} [${book.genres}]`);
    });
  }
  
  // Закрываем базу
  db.close();
  
  console.log('\nИмпорт завершен успешно!');
}

// Запускаем импорт
importBooks().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});