'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './main.module.css';
import BookCard from '@/components/BookCard/BookCard';
import BottomNav from '@/components/BottomNav/page';
import { useRouter } from 'next/navigation';

// Интерфейс книги
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
  createdAt?: string;
  rating: string;
  reviewCount?: number;
  href: string;
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/Login');
    }
  }, [router]);

  // Состояния для книг
  const [bookData, setBookData] = useState<{
    recommended: Book[];
    newArrivals: Book[];
    popular: Book[];
  }>({
    recommended: [],
    newArrivals: [],
    popular: []
  });

  // Состояния для поиска
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Функция для получения userId
  const getUserId = async (): Promise<number | null> => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return null;

    try {
      const response = await fetch('/api/user/id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      
      const data = await response.json();
      if (data.success) {
        return data.userId;
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  // Загрузка всех данных
  const fetchAllData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Загружаем все книги
      const booksResponse = await fetch('/api/books');
      const books = await booksResponse.json();

      const formattedBooks: Book[] = books.map((book: any) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        genres: book.genres,
        publishedAt: book.publishedAt,
        annotation: book.annotation,
        seriesTitle: book.seriesTitle,
        seriesNumber: book.seriesNumber,
        coverUrl: book.coverUrl || '/img/default-book.jpg',
        createdAt: book.createdAt,
        rating: book.rating || '0.0',
        reviewCount: book.reviewCount || 0,
        href: `/book/${book.id}`
      }));

      setAllBooks(formattedBooks);

      // 2. Получаем email пользователя
      const userEmail = localStorage.getItem('userEmail');
      
      // 3. Получаем рекомендации
      let recommended: Book[] = [];
      
      if (userEmail) {
        try {
          // Получаем userId
          const userId = await getUserId();
          
          if (userId) {
            // Запрашиваем рекомендации
            const recResponse = await fetch(
              `/api/recommendations?userId=${userId}&limit=8`, 
              {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache'
                }
              }
            );
            
            const recData = await recResponse.json();
            
            if (recData.success && recData.recommendations?.length > 0) {
              // Создаем Map для поиска книг
              const bookMap = new Map(formattedBooks.map(book => [book.id, book]));
              
              // Получаем рекомендованные книги
              recommended = recData.recommendations
                .map((id: number) => bookMap.get(id))
                .filter((book: Book | undefined): book is Book => book !== undefined)
                .slice(0, 8);
            }
          }
        } catch (recError) {
          console.error('Error getting recommendations:', recError);
        }
      }

      // 4. Разделяем на категории
      // Новинки
      const newArrivals = [...formattedBooks]
        .filter(book => book.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 8);

      // Популярные
      const popular = [...formattedBooks]
        .filter(book => parseFloat(book.rating) >= 3.5)
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 8);

      // Если нет рекомендаций, показываем случайные
      if (recommended.length === 0) {
        const usedIds = new Set([...newArrivals.map(b => b.id), ...popular.map(b => b.id)]);
        recommended = formattedBooks
          .filter(book => !usedIds.has(book.id))
          .slice(0, 8);
      }

      setBookData({
        recommended,
        newArrivals,
        popular
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Первоначальная загрузка и подписка на события
  useEffect(() => {
    fetchAllData();
    
    // Слушаем события обновления рекомендаций
    const handleRecommendationUpdate = () => {
      console.log('🔄 Обновляем рекомендации по событию');
      
      // Небольшая задержка, чтобы дать время БД обновиться
      setTimeout(() => {
        fetchAllData();
      }, 500);
    };
    
    window.addEventListener('recommendations-updated', handleRecommendationUpdate);
    
    return () => {
      window.removeEventListener('recommendations-updated', handleRecommendationUpdate);
    };
  }, [fetchAllData]);

  // Эффект для клика вне области поиска
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Функции поиска
  const searchBooks = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = allBooks.filter(book =>
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      (book.genres && book.genres.toLowerCase().includes(lowerQuery))
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
    router.push(book.href);
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

        {/* Контейнер поиска */}
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
                src="/img/saerch.svg"
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
                        src={book.coverUrl}
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
                        <p className={styles.searchResultAuthor} style={{ fontSize: '11px', color: '#FE7C96' }}>
                          ★ {book.rating} {book.reviewCount ? `(${book.reviewCount})` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </header>

      <main className={styles.popular}>
        <div className={styles.sectionTitle}>
          <h2>ПОДОБРАНО СПЕЦИАЛЬНО ДЛЯ ВАС</h2>
        </div>

        {isLoading ? (
          <div className={styles.special}>
            <h2>Загрузка рекомендаций...</h2>
          </div>
        ) : (
          <>
            {/* Рекомендованные книги */}
            {bookData.recommended.length > 0 && (
              <div className={styles.special}>
                <h2 style={{ color: '#FE7C96' }}>По вашим предпочтениям</h2>
                <div className={styles.popularDestinations}>
                  {bookData.recommended.map((book) => (
                    <BookCard
                      key={book.id}
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      rating={book.rating}
                      imageUrl={book.coverUrl}
                      href={book.href}
                      reviewCount={book.reviewCount}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Новинки */}
            {bookData.newArrivals.length > 0 && (
              <div className={styles.special}>
                <h2>Новинки</h2>
                <div className={styles.popularDestinations}>
                  {bookData.newArrivals.map((book) => (
                    <BookCard
                      key={book.id}
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      rating={book.rating}
                      imageUrl={book.coverUrl}
                      href={book.href}
                      reviewCount={book.reviewCount}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Популярные */}
            {bookData.popular.length > 0 && (
              <div className={styles.special}>
                <h2>Популярные</h2>
                <div className={styles.popularDestinations}>
                  {bookData.popular.map((book) => (
                    <BookCard
                      key={book.id}
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      rating={book.rating}
                      imageUrl={book.coverUrl}
                      href={book.href}
                      reviewCount={book.reviewCount}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Если нет рекомендаций */}
            {bookData.recommended.length === 0 && 
             (bookData.newArrivals.length > 0 || bookData.popular.length > 0) && (
              <div className={styles.special}>
                <h2 style={{ color: '#FE7C96' }}>По вашим предпочтениям</h2>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '12px',
                  marginTop: '1rem'
                }}>
                  <p style={{ color: '#666', marginBottom: '1rem' }}>
                    Оцените несколько книг или добавьте их в прочитанное, 
                    чтобы получить персональные рекомендации
                  </p>
                  <button 
                    onClick={() => router.push('/swipe')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#FE7C96',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    📚 Начать свайпить книги
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}