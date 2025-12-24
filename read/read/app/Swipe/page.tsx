// app/swipe/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './swipe.module.css';
import BottomNav from '@/components/BottomNav/page';
import SwipeCard from '@/components/SwipeCard';

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

export default function SwipePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      const response = await fetch('/api/books');
      const fetchedBooks = await response.json();
      setBooks(fetchedBooks);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    console.log(`Swiped ${direction} on book: ${books[currentIndex]?.title}`);
    
    if (currentIndex < books.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setBooks([]);
    }
  };

  const handleLike = () => {
    handleSwipe('right');
  };

  const handleDislike = () => {
    handleSwipe('left');
  };

  const handleSkip = () => {
    if (currentIndex < books.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSave = async () => {
    console.log('Saved to collection:', books[currentIndex]?.title);
  };

  const currentBook = books[currentIndex];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image
            src="/img/logo.png"
            alt="Логотип"
            width={32}
            height={32}
            className={styles.logoImage}
            priority
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

      <main className={styles.swipeWrapper}>
        {loading ? (
          <div className={styles.loading}>Загружаем книги...</div>
        ) : books.length === 0 ? (
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
        ) : currentBook ? (
          <div className={styles.swipeContainer}>
            {/* Карточка */}
            <div className={styles.cardWrapper}>
              <SwipeCard
                key={currentBook.id}
                book={currentBook}
                onSwipe={handleSwipe}
                isActive={true}
              />
            </div>
            
            {/* КНОПКИ ВСЕГДА ПО БОКАМ - НА ВСЕХ РАЗМЕРАХ ЭКРАНА */}
            <button 
              className={styles.leftActionBtn} 
              onClick={handleDislike}
              aria-label="Dislike"
            >
              <Image src="/img/dislike.png" alt="dislike" width={28} height={28} />
            </button>

            <button 
              className={styles.rightActionBtn} 
              onClick={handleLike}
              aria-label="Like"
            >
              <Image src="/img/like.png" alt="like" width={28} height={28} />
            </button>

            {/* Нижние кнопки */}
            <div className={styles.bottomActions}>
              <button 
                className={styles.middleBtn}
                onClick={handleSkip}
              >
                <Image src="/img/reload.png" alt="skip" width={22} height={22} />
                <span>Обновить</span>
              </button>

              <button 
                className={styles.middleBtn}
                onClick={handleSave}
              >
                <Image src="/img/collection.png" alt="save" width={22} height={22} />
                <span>В коллекцию</span>
              </button>
            </div>
            
            {/* УБИРАЕМ мобильные кнопки - они больше не нужны */}
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}