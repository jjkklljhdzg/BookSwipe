'use client';

import { useState, useEffect, useRef, useCallback } from 'react'; 
import Image from 'next/image';
import styles from './page.module.css';
import BookCard from '@/components/BookCard/BookCard';
import BottomNav from '@/components/BottomNav/page';
import { useRouter } from 'next/navigation'; 

// Тип для книги
interface Book {
  id: number;
  title: string;
  author: string;
  rating: string;
  imageUrl: string;
  href: string;
  genres?: string;
}

// === НАЧАЛО ДАННЫХ ДЛЯ ПОИСКА ===
// Объединяем все книги в один массив для поиска
const allBooksForSearch: Book[] = [
  // Рекомендованные книги
  {
    id: 1,
    title: 'Название книги 1',
    author: 'Автор 1',
    rating: '4.4',
    imageUrl: '/img/design4.jpg',
    href: '/book/1',
    genres: 'Фэнтези'
  },
  {
    id: 2,
    title: 'Название книги 2',
    author: 'Автор 2',
    rating: '4.4',
    imageUrl: '/img/design2.jpg',
    href: '/book/2',
    genres: 'Детектив'
  },
  {
    id: 3,
    title: 'Название книги 3',
    author: 'Автор 3',
    rating: '4.4',
    imageUrl: '/img/design1.jpg',
    href: '/book/3',
    genres: 'Научная фантастика'
  },
  {
    id: 4,
    title: 'Название книги 4',
    author: 'Автор 4',
    rating: '4.4',
    imageUrl: '/img/vogue1design.jpg',
    href: '/book/4',
    genres: 'Роман'
  },
  {
    id: 5,
    title: 'Название книги 5',
    author: 'Автор 5',
    rating: '4.4',
    imageUrl: '/img/vogue2design.jpg',
    href: '/book/5',
    genres: 'Драма'
  },
  // Новинки
  {
    id: 6,
    title: 'Новинка 1',
    author: 'Автор 6',
    rating: '4.4',
    imageUrl: '/img/design4.jpg',
    href: '/book/6',
    genres: 'Фэнтези'
  },
  {
    id: 7,
    title: 'Новинка 2',
    author: 'Автор 7',
    rating: '4.4',
    imageUrl: '/img/vogue2design.jpg',
    href: '/book/7',
    genres: 'Драма'
  },
  {
    id: 8,
    title: 'Новинка 3',
    author: 'Автор 8',
    rating: '4.4',
    imageUrl: '/img/design1.jpg',
    href: '/book/8',
    genres: 'Научная фантастика'
  },
  // Популярные
  {
    id: 9,
    title: 'Популярное 1',
    author: 'Автор 9',
    rating: '4.4',
    imageUrl: '/img/vogue1design.jpg',
    href: '/book/9',
    genres: 'Роман'
  },
  {
    id: 10,
    title: 'Популярное 2',
    author: 'Автор 10',
    rating: '4.4',
    imageUrl: '/img/design2.jpg',
    href: '/book/10',
    genres: 'Детектив'
  },
  {
    id: 11,
    title: 'Популярное 3',
    author: 'Автор 11',
    rating: '4.4',
    imageUrl: '/img/vogue3design.jpg',
    href: '/book/11',
    genres: 'Триллер'
  },
];

// Данные для отображения по категориям (оставляем без изменений)
const bookData = {
  recommended: allBooksForSearch.slice(0, 5),
  newArrivals: allBooksForSearch.slice(5, 8),
  popular: allBooksForSearch.slice(8, 11),
};
/* === КОНЕЦ ДАННЫХ ДЛЯ ПОИСКА === */

export default function Home() {
  const router = useRouter(); // Для навигации
  
  // === НАЧАЛО СОСТОЯНИЙ ДЛЯ ПОИСКА ===
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // === КОНЕЦ СОСТОЯНИЙ ДЛЯ ПОИСКА ===

  // === НАЧАЛО ЭФФЕКТОВ ДЛЯ ПОИСКА ===
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // === КОНЕЦ ЭФФЕКТОВ ДЛЯ ПОИСКА ===

  // === НАЧАЛО ФУНКЦИЙ ПОИСКА ===
  const searchBooks = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const results = allBooksForSearch.filter(book => 
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      (book.genres && book.genres.toLowerCase().includes(lowerQuery))
    );
    
    setSearchResults(results.slice(0, 10)); // Ограничиваем до 10 результатов
  }, []);

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
    
    // Переходим на страницу книги
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
  // === КОНЕЦ ФУНКЦИЙ ПОИСКА ===

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
        
        {/* === НАЧАЛО КОНТЕЙНЕРА ПОИСКА === */}
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
                src="/img/poisk.svg"
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
                        src={book.imageUrl || '/img/default-book.jpg'}
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
        {/* === КОНЕЦ КОНТЕЙНЕРА ПОИСКА === */}
      </header>

      <main className={styles.popular}>
        <div className={styles.sectionTitle}>
          <h2>ПОДОБРАНО СПЕЦИАЛЬНО ДЛЯ ВАС</h2>
        </div>

        {/* Рекомендованные книги */}
        <div className={styles.special}>
          <h2>По вашим предпочтениям</h2>
          <div className={styles.popularDestinations}>
            {bookData.recommended.map((book) => (
              <BookCard
                key={book.id}
                id={book.id} 
                title={book.title}
                author={book.author}
                rating={book.rating}
                imageUrl={book.imageUrl}
                href={book.href}
              />
            ))}
          </div>
        </div>

        {/* Новинки */}
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
                imageUrl={book.imageUrl}
                href={book.href}
              />
            ))}
          </div>
        </div>

        {/* Популярные */}
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
                imageUrl={book.imageUrl}
                href={book.href}
              />
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}