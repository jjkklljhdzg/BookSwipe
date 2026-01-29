// Swipe/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './swipe.module.css';
import BottomNav from '@/components/BottomNav/page';
import SwipeCard from '@/components/SwipeCard/SwipeCard';
import { useRouter } from 'next/navigation';
import Notification from '@/components/Notification/Notification';

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

async function saveToCollectionDB(userId: number, bookId: number, status: string): Promise<boolean> {
  try {
    const response = await fetch('/api/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        bookId,
        collectionType: status
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
}

async function removeFromCollectionDB(userId: number, bookId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/collection/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        bookId
      })
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    return false;
  }
}

async function checkBookStatus(userId: number, bookId: number): Promise<string> {
  try {
    const response = await fetch(`/api/collection/check?userId=${userId}&bookId=${bookId}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.inCollection && data.collectionType) {
        return data.collectionType;
      }
    }
    return 'none';
  } catch (error) {
    return 'none';
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

  // Меню коллекции
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLButtonElement>(null);

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [bookStatus, setBookStatus] = useState<'reading' | 'planned' | 'abandoned' | 'read' | 'favorite' | 'none'>('none');
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    loadUserId();
    loadBooks();
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('mousedown', handleMenuClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mousedown', handleMenuClickOutside);
    };
  }, []);

  useEffect(() => {
    if (books.length > 0 && currentIndex < books.length) {
      loadBookStatus();
    }
  }, [books, currentIndex]);

  const handleMenuClickOutside = (event: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      collectionRef.current &&
      !collectionRef.current.contains(event.target as Node)
    ) {
      setShowMenu(false);
    }
  };

  const loadBookStatus = async () => {
    const currentBook = books[currentIndex];
    if (!currentBook || !userId) {
      setBookStatus('none');
      return;
    }

    setIsLoadingStatus(true);
    
    try {
      const status = await checkBookStatus(userId, currentBook.id);
      
      if (status === 'reading') setBookStatus('reading');
      else if (status === 'planned') setBookStatus('planned');
      else if (status === 'abandoned') setBookStatus('abandoned');
      else if (status === 'read') setBookStatus('read');
      else if (status === 'favorite') setBookStatus('favorite');
      else setBookStatus('none');
    } catch (error) {
      setBookStatus('none');
    } finally {
      setIsLoadingStatus(false);
    }
  };

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

  const saveToCollection = async (status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite') => {
    const currentBook = books[currentIndex];
    if (!currentBook) {
      return;
    }

    try {
      const userId = await getUserId();
      
      if (!userId) {
        showNotification('Ошибка: пользователь не найден. Войдите в систему.', 'error');
        return;
      }

      const savedInDB = await saveToCollectionDB(userId, currentBook.id, status);
      
      if (savedInDB) {
        await loadBookStatus();
        setShowMenu(false);

        window.dispatchEvent(new CustomEvent('recommendations-updated'));

        const statusMessages = {
          reading: 'Книга добавлена в "Читаю"',
          planned: 'Книга добавлена в "В планах"',
          abandoned: 'Книга добавлена в "Брошенные"',
          read: 'Книга добавлена в "Прочитанные"',
          favorite: 'Книга добавлена в "Избранные"'
        };

        showNotification(statusMessages[status], 'success');
        
        // Переход к следующей книге после сохранения
        handleSkip();
      } else {
        showNotification('Не удалось сохранить в коллекцию', 'error');
      }
    } catch (error) {
      showNotification('Произошла ошибка при сохранении', 'error');
    }
  };

  const removeFromCollection = async () => {
    const currentBook = books[currentIndex];
    if (!currentBook) {
      return;
    }

    try {
      const userId = await getUserId();
      
      if (!userId) {
        showNotification('Ошибка: пользователь не найден', 'error');
        return;
      }

      const removedFromDB = await removeFromCollectionDB(userId, currentBook.id);
      
      if (removedFromDB) {
        setBookStatus('none');
        setShowMenu(false);
        
        window.dispatchEvent(new CustomEvent('recommendations-updated'));
        
        showNotification('Книга удалена из коллекции', 'success');
      } else {
        showNotification('Не удалось удалить из коллекции', 'error');
      }
    } catch (error) {
      showNotification('Произошла ошибка при удалении', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification(null);
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

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}

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

              <div style={{ position: 'relative' }}>
                <button
                  ref={collectionRef}
                  className={styles.middleBtn}
                  onClick={() => setShowMenu(!showMenu)}
                  title="Добавить в коллекцию"
                  disabled={isLoadingStatus}
                >
                  {isLoadingStatus ? (
                    <span style={{ fontSize: '16px' }}></span>
                  ) : (
                    <Image src="/img/collection.png" alt="collection" width={22} height={22} />
                  )}
                  <span>В коллекцию</span>
                </button>

                {showMenu && (
                  <div
                    ref={menuRef}
                    className={styles.collectionMenu}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      right: 0,
                      width: '200px',
                      backgroundColor: 'white',
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      marginBottom: '10px'
                    }}
                  >
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #eee',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      Текущий статус: {
                        bookStatus === 'reading' ? 'Читаю' :
                          bookStatus === 'planned' ? 'В планах' :
                            bookStatus === 'abandoned' ? 'Брошенные' :
                              bookStatus === 'read' ? 'Прочитанные' :
                                bookStatus === 'favorite' ? 'Избранные' :
                                  'Не в коллекции'
                      }
                    </div>

                    <button
                      onClick={() => saveToCollection('reading')}
                      disabled={isLoadingStatus}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: bookStatus === 'reading' ? '#FE7C96' : '#333',
                        fontWeight: bookStatus === 'reading' ? '600' : '400',
                        backgroundColor: bookStatus === 'reading' ? '#fff5f7' : 'white',
                        opacity: isLoadingStatus ? 0.5 : 1
                      }}
                    >
                      Читаю
                    </button>

                    <button
                      onClick={() => saveToCollection('planned')}
                      disabled={isLoadingStatus}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: bookStatus === 'planned' ? '#FE7C96' : '#333',
                        fontWeight: bookStatus === 'planned' ? '600' : '400',
                        backgroundColor: bookStatus === 'planned' ? '#fff5f7' : 'white',
                        opacity: isLoadingStatus ? 0.5 : 1
                      }}
                    >
                      В планах
                    </button>

                    <button
                      onClick={() => saveToCollection('abandoned')}
                      disabled={isLoadingStatus}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: bookStatus === 'abandoned' ? '#FE7C96' : '#333',
                        fontWeight: bookStatus === 'abandoned' ? '600' : '400',
                        backgroundColor: bookStatus === 'abandoned' ? '#fff5f7' : 'white',
                        opacity: isLoadingStatus ? 0.5 : 1
                      }}
                    >
                      Брошенные
                    </button>

                    <button
                      onClick={() => saveToCollection('read')}
                      disabled={isLoadingStatus}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: bookStatus === 'read' ? '#FE7C96' : '#333',
                        fontWeight: bookStatus === 'read' ? '600' : '400',
                        backgroundColor: bookStatus === 'read' ? '#fff5f7' : 'white',
                        opacity: isLoadingStatus ? 0.5 : 1
                      }}
                    >
                      Прочитанные
                    </button>

                    <button
                      onClick={() => saveToCollection('favorite')}
                      disabled={isLoadingStatus}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        color: bookStatus === 'favorite' ? '#FE7C96' : '#333',
                        fontWeight: bookStatus === 'favorite' ? '600' : '400',
                        backgroundColor: bookStatus === 'favorite' ? '#fff5f7' : 'white',
                        opacity: isLoadingStatus ? 0.5 : 1
                      }}
                    >
                      Избранные
                    </button>

                    <div style={{ height: '1px', backgroundColor: '#eee', margin: '8px 0' }}></div>

                    {bookStatus !== 'none' && (
                      <button
                        onClick={removeFromCollection}
                        disabled={isLoadingStatus}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          cursor: isLoadingStatus ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          color: '#ff6b6b',
                          opacity: isLoadingStatus ? 0.5 : 1
                        }}
                      >
                        Удалить из списка
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}