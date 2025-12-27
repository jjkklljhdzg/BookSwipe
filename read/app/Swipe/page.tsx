// app/swipe/page.tsx
'use client'; // Указывает, что это клиентский компонент Next.js

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './swipe.module.css';
import BottomNav from '@/components/BottomNav/page';
import SwipeCard from '@/components/SwipeCard';

// Интерфейс для типизации данных книги
interface Book {
  id: number;
  title: string;
  author: string;
  genres: string;
  published_at: string;
  annotation: string;
  series_title: string;
  series_number: string;
  cover_url: string;
}

// Основной компонент страницы свайпа (Tinder-подобный интерфейс)
export default function SwipePage() {
  // Состояние для хранения списка книг
  const [books, setBooks] = useState<Book[]>([]);
  // Индекс текущей отображаемой книги
  const [currentIndex, setCurrentIndex] = useState(0);
  // Состояние загрузки данных
  const [loading, setLoading] = useState(true);

  // Эффект для загрузки книг при монтировании компонента
  useEffect(() => {
    loadBooks();
  }, []);

  // Функция загрузки книг с API
  async function loadBooks() {
    try {
      const response = await fetch('/api/books');
      const fetchedBooks = await response.json();
      setBooks(fetchedBooks);
      setCurrentIndex(0); // Сброс индекса при загрузке новых книг
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false); // Завершение загрузки независимо от результата
    }
  }

  // Обработчик свайпа (влево/вправо)
  const handleSwipe = (direction: 'left' | 'right') => {
    console.log(`Swiped ${direction} on book: ${books[currentIndex]?.title}`);
    
    // Переход к следующей книге или очистка списка, если книги закончились
    if (currentIndex < books.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setBooks([]); // Все книги просмотрены
    }
  };

  // Обработчик лайка (свайп вправо)
  const handleLike = () => {
    handleSwipe('right');
  };

  // Обработчик дизлайка (свайп влево)
  const handleDislike = () => {
    handleSwipe('left');
  };

  // Обработчик пропуска книги
  const handleSkip = () => {
    if (currentIndex < books.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Обработчик сохранения книги в коллекцию
  const handleSave = async () => {
    console.log('Saved to collection:', books[currentIndex]?.title);
    // Здесь должна быть логика сохранения книги
  };

  // Текущая отображаемая книга
  const currentBook = books[currentIndex];

  return (
    <div className={styles.container}>
      {/* Шапка страницы с логотипом и поиском */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image
            src="/img/logo.png"
            alt="Логотип"
            width={32}
            height={32}
            className={styles.logoImage}
            priority // Приоритетная загрузка логотипа
          />
        </div>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Поиск книги"
            className={styles.searchInput}
          />
          <button className={styles.searchButton} aria-label="Search">
            <Image
              src="/img/saerch.png"
              alt="Поиск"
              width={20}
              height={20}
              className={styles.searchIcon}
            />
          </button>
        </div>
      </header>

      {/* Основная область свайпа */}
      <main className={styles.swipeWrapper}>
        {/* Состояние загрузки */}
        {loading ? (
          <div className={styles.loading}>Загружаем книги...</div>
        ) : 
        
        /* Состояние, когда все книги просмотрены */
        books.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Вы просмотрели все книги!</h2>
            <p>Загляните сюда позже или обновите список</p>
            <button 
              onClick={loadBooks} 
              className={styles.refreshButton}
            >
              Обновить
            </button>
          </div>
        ) : 
        
        /* Основной интерфейс свайпа, когда есть книги */
        currentBook ? (
          <div className={styles.swipeContainer}>
            {/* Обертка для карточки книги */}
            <div className={styles.cardWrapper}>
              <SwipeCard
                key={currentBook.id}
                book={currentBook}
                onSwipe={handleSwipe}
                isActive={true} // Указывает, что карточка активна для свайпа
              />
            </div>
            
            {/* Кнопки действий - расположены по бокам на всех экранах */}
            {/* Кнопка дизлайка (слева) */}
            <button 
              className={styles.leftActionBtn} 
              onClick={handleDislike}
              aria-label="Dislike"
            >
              <Image src="/img/dislike.png" alt="dislike" width={28} height={28} />
            </button>

            {/* Кнопка лайка (справа) */}
            <button 
              className={styles.rightActionBtn} 
              onClick={handleLike}
              aria-label="Like"
            >
              <Image src="/img/like.png" alt="like" width={28} height={28} />
            </button>

            {/* Нижняя панель с дополнительными действиями */}
            <div className={styles.bottomActions}>
              {/* Кнопка пропуска книги */}
              <button 
                className={styles.middleBtn}
                onClick={handleSkip}
              >
                <Image src="/img/reload.png" alt="skip" width={22} height={22} />
                <span>Обновить</span>
              </button>

              {/* Кнопка сохранения в коллекцию */}
              <button 
                className={styles.middleBtn}
                onClick={handleSave}
              >
                <Image src="/img/collection.png" alt="save" width={22} height={22} />
                <span>В коллекцию</span>
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Нижняя навигационная панель */}
      <BottomNav />
    </div>
  );
}