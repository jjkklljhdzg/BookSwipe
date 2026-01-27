'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './swipe.module.css';
import BottomNav from '@/components/BottomNav/page';
import SwipeCard from '@/components/SwipeCard/SwipeCard';
import { useRouter } from 'next/navigation';

interface Book {
  id: number;
  title: string;
  author: string;
  genres: string;
  publishedAt?: string;
  annotation?: string;
  seriesTitle?: string;
  seriesNumber?: number;
  coverUrl: string;
  rating: string;
}

async function getUserId(): Promise<number | null> {
  const userEmail = localStorage.getItem('userEmail');
  if (!userEmail) {
    return null;
  }

  try {
    const response = await fetch('/api/user/id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const userId = data.userId;
      localStorage.setItem('userId', userId.toString());
      return userId;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function saveSwipe(userId: number, bookId: number, action: 'like' | 'dislike') {
  try {
    const response = await fetch('/api/swipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        bookId: bookId,
        action: action
      })
    });

    const data = await response.json();
    
    if (data.success) {
      window.dispatchEvent(new CustomEvent('recommendations-updated', {
        detail: { 
          type: 'swipe', 
          action, 
          bookId
        }
      }));
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

async function saveToCollection(userId: number, bookId: number, collectionType: string = 'saved') {
  try {
    const response = await fetch('/api/collection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        bookId: bookId,
        collectionType: collectionType
      })
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      if (collectionType === 'read' || collectionType === 'reading' || collectionType === 'favorite') {
        window.dispatchEvent(new CustomEvent('recommendations-updated', {
          detail: { 
            type: 'collection', 
            collectionType, 
            bookId
          }
        }));
      }
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

export default function SwipePage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserId();
    loadBooks();
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadUserId() {
    const id = await getUserId();
    setUserId(id);
    
    if (!id) {
      const savedId = localStorage.getItem('userId');
      if (savedId) {
        setUserId(Number(savedId));
      }
    }
  }

  async function loadBooks() {
    try {
      setLoading(true);
      const response = await fetch('/api/books');
      const fetchedBooks = await response.json();

      const formattedBooks: Book[] = fetchedBooks.map((book: any) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        genres: book.genres,
        publishedAt: book.publishedAt,
        annotation: book.annotation,
        seriesTitle: book.seriesTitle,
        seriesNumber: book.seriesNumber,
        coverUrl: book.coverUrl || '/img/default-book.jpg',
        rating: book.rating || '0.0'
      }));

      setBooks(formattedBooks);
      setAllBooks(formattedBooks);
      setCurrentIndex(0);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  const searchBooks = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = allBooks.filter(book =>
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      (book.genres && book.genres.toLowerCase().includes(lowerQuery)) ||
      (book.seriesTitle && book.seriesTitle.toLowerCase().includes(lowerQuery))
    );

    setSearchResults(results.slice(0, 10));
  }, [allBooks]);

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

  const handleResultClick = (book: Book) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    router.push(`/book/${book.id}`);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setShowResults(false);
    }
  };

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
    if (currentIndex < books.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      loadBooks();
    }
  };

  const handleLike = async () => {
    const currentBook = books[currentIndex];
    if (!currentBook) return;

    if (userId) {
      await saveSwipe(userId, currentBook.id, 'like');
    } else {
      const newUserId = await getUserId();
      if (newUserId) {
        setUserId(newUserId);
        await saveSwipe(newUserId, currentBook.id, 'like');
      }
    }

    handleSwipe('right');
  };

  const handleDislike = async () => {
    const currentBook = books[currentIndex];
    if (!currentBook) return;

    if (userId) {
      await saveSwipe(userId, currentBook.id, 'dislike');
    } else {
      const newUserId = await getUserId();
      if (newUserId) {
        setUserId(newUserId);
        await saveSwipe(newUserId, currentBook.id, 'dislike');
      }
    }

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
    const currentBook = books[currentIndex];
    if (!currentBook) return;

    // 🔥 ТОЛЬКО сохранение в базу данных (никакого localStorage!)
    if (userId) {
      await saveToCollection(userId, currentBook.id, 'saved');
    } else {
      const newUserId = await getUserId();
      if (newUserId) {
        setUserId(newUserId);
        await saveToCollection(newUserId, currentBook.id, 'saved');
      }
    }

    if (currentIndex < books.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      loadBooks();
    }
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
                        src={book.coverUrl || '/img/default-book.jpg'}
                        alt={book.title}
                        width={40}
                        height={60}
                        className={styles.searchResultImage}
                      />
                      <div className={styles.searchResultInfo}>
                        <h4 className={styles.searchResultTitle}>{book.title}</h4>
                        <p className={styles.searchResultAuthor}>{book.author}</p>
                        {book.genres && (
                          <p className={styles.searchResultAuthor} style={{ fontSize: '11px' }}>
                            {book.genres}
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
          <div className={styles.loading}>
            <p>Загружаем книги...</p>
            {!userId && <p style={{ fontSize: '12px', color: '#ff6b6b' }}>Пытаемся получить ID пользователя...</p>}
          </div>
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
              title="Не нравится"
            >
              <Image src="/img/dislike.png" alt="dislike" width={28} height={28} />
            </button>

            <button
              className={styles.rightActionBtn}
              onClick={handleLike}
              aria-label="Like"
              title="Нравится"
            >
              <Image src="/img/like.png" alt="like" width={28} height={28} />
            </button>

            <div className={styles.bottomActions}>
              <button
                className={styles.middleBtn}
                onClick={handleSkip}
                title="Пропустить книгу"
              >
                <Image src="/img/reload.png" alt="skip" width={22} height={22} />
                <span>Пропустить</span>
              </button>

              <button
                className={styles.middleBtn}
                onClick={handleSave}
                title="Сохранить в коллекцию"
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