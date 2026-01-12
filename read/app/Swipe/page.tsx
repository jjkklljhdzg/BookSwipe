'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './swipe.module.css';
import BottomNav from '@/components/BottomNav/page';
import SwipeCard from '@/components/SwipeCard';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]); // Все книги для поиска
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadBooks() {
    try {
      const response = await fetch('/api/books');
      const fetchedBooks = await response.json();
      setBooks(fetchedBooks);
      setAllBooks(fetchedBooks); // Сохраняем все книги для поиска
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  }

  // Поиск книг
  const searchBooks = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const results = allBooks.filter(book => 
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      book.genres.toLowerCase().includes(lowerQuery) ||
      book.series_title.toLowerCase().includes(lowerQuery)
    );
    
    setSearchResults(results.slice(0, 10)); // Ограничиваем до 10 результатов
  }, [allBooks]);

  // Обработчик изменения поискового запроса
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchBooks(value);
    
    if (value.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  // Обработчик клика на результат поиска
  const handleResultClick = (book: Book) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    
    // Переходим на страницу книги
    router.push(`/book/${book.id}`);
  };

  // Обработчик клика вне области поиска
  const handleClickOutside = (event: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setShowResults(false);
    }
  };

  // Обработчик нажатия Enter в поиске
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
    if (e.key === 'Escape') {
      setShowResults(false);
      setSearchQuery('');
    }
  };

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
    } else {
      loadBooks();
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
        
        <div className={styles.searchWrapper} ref={searchRef}>
          <div className={styles.searchContainer}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Поиск книги"
              className={styles.searchInput}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchQuery.length > 0 && searchResults.length > 0) {
                  setShowResults(true);
                }
              }}
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
          
          {showResults && (
            <>
              <div 
                className={styles.searchOverlay}
                onClick={() => setShowResults(false)}
              />
              <div className={styles.searchResults}>
                {searchResults.length === 0 ? (
                  <div className={styles.noResults}>
                    {searchQuery.trim() ? 'Книги не найдены' : 'Начните вводить название книги, автора или жанр'}
                  </div>
                ) : (
                  searchResults.map((book) => (
                    <div
                      key={book.id}
                      className={styles.searchResultItem}
                      onClick={() => handleResultClick(book)}
                    >
                      <Image
                        src={book.cover_url || '/img/default-book.jpg'}
                        alt={book.title}
                        width={40}
                        height={60}
                        className={styles.searchResultImage}
                      />
                      <div className={styles.searchResultInfo}>
                        <h4 className={styles.searchResultTitle}>{book.title}</h4>
                        <p className={styles.searchResultAuthor}>{book.author}</p>
                        {book.series_title && (
                          <p className={styles.searchResultAuthor} style={{ fontSize: '11px' }}>
                            {book.series_title}
                            {book.series_number && ` #${book.series_number}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
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
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}