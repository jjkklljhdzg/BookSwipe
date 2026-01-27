// book/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './book.module.css';
import BottomNav from '@/components/BottomNav/page';
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
    reviewCount: number;
    reviews: Review[];
    createdAt?: string;
}

interface Review {
    id: number;
    rating: number;
    text: string;
    createdAt: string;
    userName: string;
    userAvatar: string;
    date: string;
}

interface Comment {
    id: number;
    bookId: number;
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number;
    text: string;
    date: string;
    bookTitle: string;
    bookAuthor: string;
    bookImage: string;
}

interface SearchBook {
    id: number;
    title: string;
    author: string;
    genres: string;
    coverUrl: string;
    rating: string;
    reviewCount?: number;
    href: string;
}

const StarRating = ({
    rating,
    onRatingChange,
    hoverRating,
    onHoverChange
}: {
    rating: number;
    onRatingChange: (rating: number) => void;
    hoverRating: number;
    onHoverChange: (rating: number) => void;
}) => {
    return (
        <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`${styles.starButton} ${star <= (hoverRating || rating) ? styles.active : ''}`}
                    onClick={() => onRatingChange(star)}
                    onMouseEnter={() => onHoverChange(star)}
                    onMouseLeave={() => onHoverChange(0)}
                >
                    ★
                </button>
            ))}
        </div>
    );
};

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

async function checkBookStatus(userId: number, bookId: string): Promise<string> {
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

export default function BookPage() {
    const params = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия',
        avatar: '/img/ava.jpg',
        userId: 'current-user'
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchBook[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [allBooks, setAllBooks] = useState<SearchBook[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const burgerRef = useRef<HTMLButtonElement>(null);

    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);

    const [bookStatus, setBookStatus] = useState<'reading' | 'planned' | 'abandoned' | 'read' | 'favorite' | 'none'>('none');
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    useEffect(() => {
        const savedName = localStorage.getItem('userName') || 'Имя Фамилия';
        const savedAvatar = localStorage.getItem('userAvatar') || '/img/ava.jpg';

        setUserData({
            name: savedName,
            avatar: savedAvatar,
            userId: 'current-user'
        });

        loadBook();
        loadAllBooks();
        loadComments();

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('mousedown', handleMenuClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousedown', handleMenuClickOutside);
        };
    }, [params.id]);

    useEffect(() => {
        if (book) {
            loadBookStatus();
        }
    }, [book, params.id]);

    const handleMenuClickOutside = (event: MouseEvent) => {
        if (
            menuRef.current &&
            !menuRef.current.contains(event.target as Node) &&
            burgerRef.current &&
            !burgerRef.current.contains(event.target as Node)
        ) {
            setShowMenu(false);
        }
    };

    const loadBookStatus = async () => {
        const bookId = params.id;
        if (!bookId) {
            setBookStatus('none');
            return;
        }

        setIsLoadingStatus(true);
        
        const userId = await getUserId();
        if (!userId) {
            setBookStatus('none');
            setIsLoadingStatus(false);
            return;
        }

        try {
            const status = await checkBookStatus(userId, bookId as string);
            
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

    const loadComments = () => {
        const bookId = params.id;
        if (!bookId) return;

        const savedComments = localStorage.getItem('bookComments');
        if (savedComments) {
            try {
                const allComments: Comment[] = JSON.parse(savedComments);
                const bookComments = allComments.filter(comment => 
                    comment.bookId.toString() === bookId
                );
                setComments(bookComments);
            } catch (error) {
                setComments([]);
            }
        }
    };

    const saveToCollection = async (status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite') => {
        if (!book) {
            return;
        }

        try {
            const userId = await getUserId();
            
            if (!userId) {
                showNotification('Ошибка: пользователь не найден. Войдите в систему.', 'error');
                return;
            }

            const savedInDB = await saveToCollectionDB(userId, book.id, status);
            
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
            } else {
                showNotification('Не удалось сохранить в коллекцию', 'error');
            }
        } catch (error) {
            showNotification('Произошла ошибка при сохранении', 'error');
        }
    };

    const removeFromCollection = async () => {
        if (!book) {
            return;
        }

        try {
            const userId = await getUserId();
            
            if (!userId) {
                showNotification('Ошибка: пользователь не найден', 'error');
                return;
            }

            const removedFromDB = await removeFromCollectionDB(userId, book.id);
            
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

    const loadAllBooks = async () => {
        try {
            const response = await fetch('/api/books');
            if (!response.ok) {
                throw new Error('Ошибка загрузки книг');
            }

            const books = await response.json();

            const formattedBooks: SearchBook[] = books.map((book: any) => ({
                id: book.id,
                title: book.title,
                author: book.author,
                genres: book.genres,
                coverUrl: book.coverUrl || '/img/default-book.jpg',
                rating: book.rating || '0.0',
                reviewCount: book.reviewCount || 0,
                href: `/book/${book.id}`
            }));

            setAllBooks(formattedBooks);
        } catch (error) {
        }
    };

    const searchBooks = (query: string) => {
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
    };

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

    const handleResultClick = (result: SearchBook) => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
        router.push(result.href);
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

    const loadBook = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const bookId = params.id;

            if (!bookId) {
                setError('ID книги не указан');
                router.push('/');
                return;
            }

            const response = await fetch(`/api/books/${bookId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setError('Книга не найдена');
                    router.push('/');
                    return;
                } else if (response.status === 400) {
                    setError('Неверный ID книги');
                    router.push('/');
                    return;
                }
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }

            const bookData = await response.json();
            setBook(bookData);

        } catch (error) {
            setError('Произошла ошибка при загрузке книги');
        } finally {
            setIsLoading(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault();

        if (!book) {
            showNotification('Ошибка: книга не найдена', 'error');
            return;
        }

        if (!userRating) {
            showNotification('Пожалуйста, поставьте оценку', 'error');
            return;
        }

        if (!commentText.trim()) {
            showNotification('Пожалуйста, напишите комментарий', 'error');
            return;
        }

        try {
            const newComment: Comment = {
                id: Date.now(),
                bookId: book.id,
                userId: userData.userId,
                userName: userData.name,
                userAvatar: userData.avatar,
                rating: userRating,
                text: commentText.trim(),
                date: new Date().toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                }),
                bookTitle: book.title,
                bookAuthor: book.author,
                bookImage: book.coverUrl
            };

            const savedBookComments = localStorage.getItem('bookComments');
            const allBookComments = savedBookComments ? JSON.parse(savedBookComments) : [];
            
            const filteredBookComments = allBookComments.filter(
                (comment: Comment) => !(comment.bookId === book.id && comment.userId === userData.userId)
            );
            
            filteredBookComments.unshift(newComment);
            const limitedBookComments = filteredBookComments.slice(0, 1000);
            localStorage.setItem('bookComments', JSON.stringify(limitedBookComments));

            const userReviews = localStorage.getItem('userReviews');
            const reviews = userReviews ? JSON.parse(userReviews) : [];
            
            const filteredUserReviews = reviews.filter(
                (review: Comment) => !(review.bookId === book.id && review.userId === userData.userId)
            );
            
            filteredUserReviews.unshift(newComment);
            const limitedUserReviews = filteredUserReviews.slice(0, 100);
            localStorage.setItem('userReviews', JSON.stringify(limitedUserReviews));

            setComments([newComment, ...comments.filter(c => !(c.bookId === book.id && c.userId === userData.userId))]);
            setCommentText('');
            setUserRating(0);
            setHoverRating(0);

            showNotification('Спасибо за ваш отзыв! Отзыв успешно опубликован и сохранен в профиле.');
        } catch (error) {
            showNotification('Произошла ошибка при сохранении отзыва', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div>Загрузка книги...</div>
                    {error && <div className={styles.errorText}>{error}</div>}
                </div>
            </div>
        );
    }

    if (error || !book) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>
                    <h2>Ошибка</h2>
                    <p>{error || 'Книга не найдена'}</p>
                    <button
                        className={styles.backButton}
                        onClick={() => router.push('/')}
                    >
                        Вернуться на главную
                    </button>
                </div>
            </div>
        );
    }

    const bookRating = parseFloat(book.rating);
    const genreArray = book.genres ?
        book.genres.split(',').map(genre => genre.trim()).filter(genre => genre.length > 0)
        : [];

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
                                    searchResults.map((result) => (
                                        <div
                                            key={result.id}
                                            className={styles.searchResultItem}
                                            onClick={() => handleResultClick(result)}
                                        >
                                            <Image
                                                src={result.coverUrl}
                                                alt={result.title}
                                                width={40}
                                                height={60}
                                                className={styles.searchResultImage}
                                            />
                                            <div className={styles.searchResultInfo}>
                                                <h4 className={styles.searchResultTitle}>{result.title}</h4>
                                                <p className={styles.searchResultAuthor}>{result.author}</p>
                                                {result.genres && (
                                                    <p className={styles.searchResultGenre}>
                                                        {result.genres.split(',')[0].trim()}
                                                    </p>
                                                )}
                                                <p className={styles.searchResultAuthor} style={{ fontSize: '11px', color: '#FE7C96' }}>
                                                    ★ {result.rating} {result.reviewCount ? `(${result.reviewCount})` : ''}
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

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={hideNotification}
                />
            )}

            <main className={styles.bookMain}>
                <div className={styles.MainInfo}>
                    <div className={styles.bookCover}>
                        <Image
                            src={book.coverUrl || '/img/default-book.jpg'}
                            alt={book.title}
                            width={200}
                            height={300}
                            className={styles.coverImage}
                            priority
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/img/default-book.jpg';
                            }}
                        />
                    </div>

                    <div className={styles.bookInfo}>
                        <div className={styles.burgerMenu}>
                            <div className={styles.listBurger}>
                                <div style={{ flex: 1 }}>
                                    <h2 className={styles.bookTitle}>{book.title}</h2>

                                    {book.seriesTitle && (
                                        <div className={styles.bookSeries}>
                                            {book.seriesTitle}
                                            {book.seriesNumber && ` #${book.seriesNumber}`}
                                        </div>
                                    )}
                                </div>

                                <button
                                    ref={burgerRef}
                                    onClick={() => setShowMenu(!showMenu)}
                                    className={styles.burgerButt}
                                    aria-label="Меню коллекции"
                                    disabled={isLoadingStatus}
                                >
                                    {isLoadingStatus ? (
                                        <span style={{ fontSize: '14px' }}>🔄</span>
                                    ) : (
                                        <Image
                                            src="/img/plus.svg"
                                            alt="Меню"
                                            width={20}
                                            height={20}
                                        />
                                    )}
                                </button>
                            </div>

                            {showMenu && (
                                <div
                                    ref={menuRef}
                                    className={styles.Menu}
                                >
                                    <div className={styles.status}>
                                        {isLoadingStatus ? (
                                            'Загрузка статуса...'
                                        ) : (
                                            <>
                                                Текущий статус: {
                                                    bookStatus === 'reading' ? 'Читаю' :
                                                        bookStatus === 'planned' ? 'В планах' :
                                                            bookStatus === 'abandoned' ? 'Брошенные' :
                                                                bookStatus === 'read' ? 'Прочитанные' :
                                                                    bookStatus === 'favorite' ? 'Избранные' :
                                                                        'Не в коллекции'
                                                }
                                            </>
                                        )}
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

                                    <div className={styles.separator}></div>

                                    {bookStatus !== 'none' && (
                                        <button
                                            onClick={removeFromCollection}
                                            disabled={isLoadingStatus}
                                            className={styles.delete}
                                            style={{ opacity: isLoadingStatus ? 0.5 : 1 }}
                                        >
                                            Удалить из списка
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.bookAuthor}>
                            <span className={styles.authorLabel}>АВТОР:</span>
                            <span className={styles.authorName}>{book.author}</span>
                        </div>

                        {genreArray.length > 0 && (
                            <div className={styles.genreSection}>
                                <div className={styles.genresContainer}>
                                    {genreArray.map((genre, index) => (
                                        <span key={index} className={styles.genreTag}>
                                            {genre}
                                        </span>
                                    ))}
                                </div>
                                {bookRating > 0 && (
                                    <div className={styles.bookRating}>
                                        ★ {book.rating}
                                        {book.reviewCount > 0 && ` (${book.reviewCount})`}
                                    </div>
                                )}
                            </div>
                        )}

                        {book.publishedAt && (
                            <div className={styles.bookDetails}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Год публикации:</span>
                                    <span className={styles.detailValue}>
                                        {new Date(book.publishedAt).getFullYear()}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className={styles.description}>
                            <h3 className={styles.descriptionTitle}>АННОТАЦИЯ</h3>
                            <p className={styles.descriptionText}>
                                {book.annotation || 'Аннотация отсутствует'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={styles.reviewSection}>
                    <h3 className={styles.reviewTitle}>ВАШ ОТЗЫВ</h3>
                    <form onSubmit={handleSubmitComment} className={styles.reviewForm}>
                        <div className={styles.ratingInput}>
                            <span className={styles.ratingLabel}>Оценка:</span>
                            <StarRating
                                rating={userRating}
                                onRatingChange={setUserRating}
                                hoverRating={hoverRating}
                                onHoverChange={setHoverRating}
                            />
                            {userRating > 0 && (
                                <span className={styles.selectedRating}>
                                    {userRating}/5
                                </span>
                            )}
                        </div>

                        <div className={styles.commentInput}>
                            <label htmlFor="comment" className={styles.commentLabel}>
                                Комментарий:
                            </label>
                            <textarea
                                id="comment"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                className={styles.commentTextarea}
                                placeholder="Поделитесь своими впечатлениями о книге..."
                                rows={4}
                                maxLength={500}
                            />
                            <div className={styles.charCount}>
                                {commentText.length}/500 символов
                            </div>
                        </div>

                        <button type="submit" className={styles.submitReviewButton}>
                            ОТПРАВИТЬ ОТЗЫВ
                        </button>
                    </form>
                </div>

                <div className={styles.commentsSection}>
                    <h3 className={styles.commentsTitle}>ОТЗЫВЫ ЧИТАТЕЛЕЙ</h3>
                    
                    {comments.length > 0 ? (
                        <div className={styles.commentsList}>
                            {comments.map((comment) => (
                                <div key={comment.id} className={styles.commentCard}>
                                    <div className={styles.commentHeader}>
                                        <div className={styles.commentUser}>
                                            <div
                                                className={styles.commentAvatar}
                                                style={{ backgroundImage: `url(${comment.userAvatar})` }}
                                            />
                                            <div>
                                                <div className={styles.commentUserName}>{comment.userName}</div>
                                                <div className={styles.commentDate}>{comment.date}</div>
                                            </div>
                                        </div>
                                        <div className={styles.commentRating}>
                                            {'★'.repeat(comment.rating)}
                                            <span className={styles.commentRatingNumber}>
                                                {comment.rating}/5
                                            </span>
                                        </div>
                                    </div>
                                    <p className={styles.commentText}>{comment.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.noComments}>
                            <p>Пока нет отзывов. Будьте первым, кто оставит отзыв!</p>
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}