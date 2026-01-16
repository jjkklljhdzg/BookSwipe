// scripts/import-from-json.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('📚 Импорт книг из JSON в базу данных\n');

// Пути к файлам
const DB_PATH = path.join(__dirname, '..', 'BookSwipe.db');
const JSON_PATH = path.join(__dirname, '..', 'data', 'initial-books.json');

// Проверяем существование JSON файла
if (!fs.existsSync(JSON_PATH)) {
  console.error(`❌ Файл не найден: ${JSON_PATH}`);
  console.error('Пожалуйста, создайте файл data/initial-books.json с книгами');
  process.exit(1);
}

// ========== ФУНКЦИЯ ДЛЯ СОЗДАНИЯ КРАСИВОЙ ОБЛОЖКИ ==========

function createBeautifulCover(title, author, genre) {
  const colors = [
    ['#1a237e', '#283593'], // глубокий синий
    ['#006064', '#00838f'], // бирюзовый
    ['#4a148c', '#6a1b9a'], // фиолетовый
    ['#33691e', '#558b2f'], // зеленый
    ['#bf360c', '#d84315'], // оранжевый
    ['#37474f', '#546e7a'], // серо-синий
    ['#880e4f', '#ad1457'], // розовый
    ['#827717', '#9e9d24'], // оливковый
  ];
  
  const color = colors[Math.floor(Math.random() * colors.length)];
  const firstLetter = (title[0] || 'К').toUpperCase();
  
  const svg = `
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color[0]}"/>
      <stop offset="100%" stop-color="${color[1]}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  
  <!-- Фон -->
  <rect width="360" height="560" x="20" y="20" fill="url(#bg)" rx="12" ry="12" filter="url(#shadow)"/>
  
  <!-- Декоративный круг -->
  <circle cx="200" cy="220" r="90" fill="white" fill-opacity="0.08"/>
  
  <!-- Первая буква -->
  <text x="200" y="240" text-anchor="middle" font-family="Georgia" font-size="110" 
        font-weight="bold" fill="white" opacity="0.9">${firstLetter}</text>
  
  <!-- Название -->
  <text x="200" y="370" text-anchor="middle" font-family="Arial" font-size="20" 
        font-weight="bold" fill="white">
    <tspan x="200" dy="0">${truncateText(title, 18)}</tspan>
  </text>
  
  <!-- Автор -->
  <text x="200" y="410" text-anchor="middle" font-family="Georgia" font-size="16" 
        fill="white" fill-opacity="0.85" style="font-style: italic;">
    ${truncateText(author, 22)}
  </text>
  
  <!-- Жанр -->
  <rect x="120" y="470" width="160" height="32" rx="16" ry="16" fill="white" fill-opacity="0.15"/>
  <text x="200" y="490" text-anchor="middle" font-family="Arial" font-size="14" 
        fill="white" fill-opacity="0.9">
    ${truncateText(genre, 15)}
  </text>
</svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ИМПОРТА ==========

async function importBooks() {
  console.log('📖 Чтение JSON файла...');
  
  let books;
  try {
    const jsonData = fs.readFileSync(JSON_PATH, 'utf-8');
    books = JSON.parse(jsonData);
    console.log(`✅ Прочитано ${books.length} книг из JSON\n`);
  } catch (error) {
    console.error(`❌ Ошибка чтения JSON: ${error.message}`);
    process.exit(1);
  }
  
  // Подключаемся к базе данных
  const db = new Database(DB_PATH);
  
  // Создаем таблицу с правильной структурой
  console.log('🗄️  Создаем таблицу в базе данных...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS Book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      genres TEXT DEFAULT 'Художественная литература',
      published_at TEXT DEFAULT '0000',
      annotation TEXT DEFAULT '',
      series_title TEXT DEFAULT '',
      series_number INTEGER DEFAULT 0,
      cover_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✅ Таблица создана\n');
  
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
  
  console.log('🔄 Импортируем книги...\n');
  
  // Проходим по всем книгам
  books.forEach((book, index) => {
    const bookNumber = index + 1;
    
    try {
      // Проверяем обязательные поля
      if (!book.title || !book.author) {
        console.log(`⏭️  [${bookNumber}] Пропущена: нет названия или автора`);
        skipped++;
        return;
      }
      
      // Проверяем дубликаты
      const existing = checkExistsStmt.get(book.title, book.author);
      if (existing) {
        console.log(`⏭️  [${bookNumber}] Уже в базе: "${book.title}"`);
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
      
      // Создаем обложку если нет
      let cover_url = book.cover_url || '';
      if (!cover_url || cover_url.trim() === '') {
        cover_url = createBeautifulCover(title, author, genres);
      }
      
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
      console.log(`✅ [${bookNumber}] Добавлена: "${title}" - ${author}`);
      
    } catch (error) {
      errors++;
      console.log(`❌ [${bookNumber}] Ошибка: ${error.message}`);
      console.log(`   Книга: ${JSON.stringify(book, null, 2)}`);
    }
  });
  
  // ========== ВЫВОД РЕЗУЛЬТАТОВ ==========
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 РЕЗУЛЬТАТЫ ИМПОРТА');
  console.log('='.repeat(60));
  
  // Получаем общую статистику
  const totalInDb = db.prepare('SELECT COUNT(*) as count FROM Book').get().count;
  
  console.log('📊 Статистика:');
  console.log(`   Всего в JSON: ${books.length} книг`);
  console.log(`   Успешно добавлено: ${added} книг`);
  console.log(`   Пропущено (дубликаты): ${skipped} книг`);
  console.log(`   Ошибок: ${errors} книг`);
  console.log(`   Всего в базе: ${totalInDb} книг`);
  
  // Показываем топ жанров
  const genreStats = db.prepare(`
    SELECT genres, COUNT(*) as count 
    FROM Book 
    GROUP BY genres 
    ORDER BY count DESC
    LIMIT 10
  `).all();
  
  if (genreStats.length > 0) {
    console.log('\n📚 Распределение по жанрам:');
    genreStats.forEach(stat => {
      console.log(`   ${stat.genres}: ${stat.count} книг`);
    });
  }
  
  // Показываем последние добавленные книги
  const recentBooks = db.prepare(`
    SELECT title, author, genres 
    FROM Book 
    ORDER BY id DESC 
    LIMIT 5
  `).all();
  
  if (recentBooks.length > 0) {
    console.log('\n📖 Последние добавленные книги:');
    recentBooks.forEach((book, i) => {
      console.log(`   ${i+1}. "${book.title}" - ${book.author} [${book.genres}]`);
    });
  }
  
  // Закрываем базу
  db.close();
  
  console.log('\n✅ Импорт завершен успешно!');
  console.log('\n💡 Для просмотра книг запустите: npm run list-books');
}

// ========== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ==========

function showAllBooks() {
  const db = new Database(DB_PATH);
  
  console.log('\n📚 ВСЕ КНИГИ В БАЗЕ ДАННЫХ:\n');
  
  try {
    const books = db.prepare(`
      SELECT id, title, author, genres 
      FROM Book 
      ORDER BY id
    `).all();
    
    if (books.length === 0) {
      console.log('База данных пуста');
    } else {
      books.forEach(book => {
        console.log(`${book.id}. "${book.title}" - ${book.author} [${book.genres}]`);
      });
      console.log(`\nВсего: ${books.length} книг`);
    }
    
  } catch (error) {
    console.log(`Ошибка: ${error.message}`);
  }
  
  db.close();
}

function clearDatabase() {
  const db = new Database(DB_PATH);
  
  console.log('🧹 Очищаем базу данных...');
  
  try {
    db.exec('DELETE FROM Book');
    db.exec('DELETE FROM sqlite_sequence WHERE name="Book"');
    console.log('✅ База данных очищена');
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
  }
  
  db.close();
}

// ========== ЗАПУСК ==========

const args = process.argv.slice(2);

if (args.includes('--show')) {
  showAllBooks();
} else if (args.includes('--clear')) {
  clearDatabase();
} else if (args.includes('--reset')) {
  clearDatabase();
  importBooks();
} else {
  importBooks();
}