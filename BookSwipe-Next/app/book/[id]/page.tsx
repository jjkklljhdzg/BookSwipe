'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './book.module.css';
import BottomNav from '@/components/BottomNav/page';
import Notification from '@/components/Notification/Notification';

// Тип для данных книги из базы данных
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

// Тип для отзыва из базы данных
interface Review {
    id: number;
    rating: number;
    text: string;
    createdAt: string;
    userName: string;
    userAvatar: string;
    date: string;
}

// Тип для комментария (старая логика)
interface Comment {
    id: number;
    bookId: number;
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number;
    text: string;
    date: string;
}

// Тип для поиска книги
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

// Компонент рейтинга звездами
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

export default function BookPage() {
    const params = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Состояния для комментариев и рейтинга (старая логика)
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<Comment[]>([]);
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия',
        avatar: '/img/ava.jpg'
    });
    
    // Состояния для поиска (как на главной)
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchBook[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [allBooks, setAllBooks] = useState<SearchBook[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Состояние для уведомлений
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);

    useEffect(() => {
        // Загружаем данные пользователя (старая логика)
        const savedName = localStorage.getItem('userName') || 'Имя Фамилия';
        const savedAvatar = localStorage.getItem('userAvatar') || '/img/ava.jpg';

        setUserData({
            name: savedName,
            avatar: savedAvatar
        });

        // Загружаем книгу из базы данных
        loadBook();
        
        // Загружаем все книги для поиска
        loadAllBooks();
        
        // Добавляем обработчик клика вне области поиска
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [params.id]);

    // Функция загрузки всех книг для поиска
    const loadAllBooks = async () => {
        try {
            const response = await fetch('/api/books');
            if (!response.ok) {
                throw new Error('Ошибка загрузки книг');
            }
            
            const books = await response.json();
            
            // Форматируем книги для поиска (как на главной)
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
            console.error('Ошибка при загрузке всех книг:', error);
        }
    };

    // Функция поиска книг (как на главной)
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
        
        setSearchResults(results.slice(0, 10)); // Ограничиваем 10 результатами
    };

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
    const handleResultClick = (result: SearchBook) => {
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
        router.push(result.href);
    };

    // Обработчик клика вне области поиска
    const handleClickOutside = (event: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            setShowResults(false);
        }
    };

    // Обработчик клавиш в поиске
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchResults.length > 0) {
            handleResultClick(searchResults[0]);
        }
        if (e.key === 'Escape') {
            setShowResults(false);
            setSearchQuery('');
        }
    };

    // Функция загрузки книги
    const loadBook = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Получаем ID из параметров
            const bookId = params.id;
            
            if (!bookId) {
                setError('ID книги не указан');
                router.push('/');
                return;
            }

            // Запрос к API для получения книги по ID
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
            
            // Загружаем комментарии (старая логика)
            loadComments(bookData.id);
            
        } catch (error) {
            console.error('Ошибка при загрузке книги:', error);
            setError('Произошла ошибка при загрузке книги');
        } finally {
            setIsLoading(false);
        }
    };

    // Функции для управления уведомлениями (старая логика)
    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

    // Загружаем комментарии (старая логика)
    const loadComments = (bookId: number) => {
        const savedComments = localStorage.getItem('bookComments');
        if (savedComments) {
            try {
                const allComments: Comment[] = JSON.parse(savedComments);
                const bookComments = allComments.filter(comment => comment.bookId === bookId);
                setComments(bookComments);
            } catch (error) {
                console.error('Ошибка при загрузке комментариев:', error);
                // Если данные повреждены, очищаем localStorage для этой книги
                localStorage.removeItem('bookComments');
                setComments([]);
            }
        }
    };

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault(); // Предотвращаем перезагрузку страницы

        // Проверяем, что всё заполнено (старая логика)
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
            // Создаём объект комментария (старая логика)
            const newComment: Comment = {
                id: Date.now(), // Уникальный ID на основе времени
                bookId: book.id,
                userId: 'current-user',
                userName: userData.name,
                userAvatar: userData.avatar,
                rating: userRating,
                text: commentText.trim(),
                date: new Date().toLocaleDateString('ru-RU') 
            };
            
            // Сохраняем в localStorage (старая логика)
            const savedComments = localStorage.getItem('bookComments');
            const allComments = savedComments ? JSON.parse(savedComments) : [];
            
            // Добавляем новый комментарий в начало
            allComments.unshift(newComment);
            
            // Ограничиваем количество комментариев, чтобы избежать переполнения
            // Оставляем только последние 1000 комментариев
            const limitedComments = allComments.slice(0, 1000);
            
            localStorage.setItem('bookComments', JSON.stringify(limitedComments));

            // Также сохраняем в профиль пользователя (старая логика)
            const userReviews = localStorage.getItem('userReviews');
            const reviews = userReviews ? JSON.parse(userReviews) : [];
            reviews.unshift({
                ...newComment,
                bookTitle: book.title,
                bookAuthor: book.author,
                bookImage: book.coverUrl
            });
            
            // Ограничиваем количество отзывов в профиле
            const limitedUserReviews = reviews.slice(0, 100);
            localStorage.setItem('userReviews', JSON.stringify(limitedUserReviews));

            // Обновляем состояние (старая логика)
            setComments([newComment, ...comments]); // Новый комментарий в начало
            setCommentText(''); // Очищаем текстовое поле
            setUserRating(0); // Сбрасываем оценку
            setHoverRating(0); // Сбрасываем hover-оценку

            showNotification('Спасибо за ваш отзыв! Отзыв успешно опубликован.');
        } catch (error) {
            console.error('Ошибка при сохранении отзыва:', error);
            
            // Если ошибка переполнения, очищаем старые данные
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                // Очищаем все комментарии и начинаем заново
                localStorage.removeItem('bookComments');
                localStorage.removeItem('userReviews');
                
                // Сохраняем только новый комментарий
                const newComment: Comment = {
                    id: Date.now(),
                    bookId: book.id,
                    userId: 'current-user',
                    userName: userData.name,
                    userAvatar: userData.avatar,
                    rating: userRating,
                    text: commentText.trim(),
                    date: new Date().toLocaleDateString('ru-RU') 
                };
                
                localStorage.setItem('bookComments', JSON.stringify([newComment]));
                localStorage.setItem('userReviews', JSON.stringify([{
                    ...newComment,
                    bookTitle: book.title,
                    bookAuthor: book.author,
                    bookImage: book.coverUrl
                }]));
                
                setComments([newComment]);
                setCommentText('');
                setUserRating(0);
                setHoverRating(0);
                
                showNotification('Отзыв сохранен. Старые данные были очищены из-за ограничений хранилища.');
            } else {
                showNotification('Произошла ошибка при сохранении отзыва', 'error');
            }
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

    // Преобразуем рейтинг в число
    const bookRating = parseFloat(book.rating);
    
    // Разделяем жанры по запятой
    const genreArray = book.genres ? 
        book.genres.split(',').map(genre => genre.trim()).filter(genre => genre.length > 0) 
        : [];

    return (
        <div className={styles.container}>
            {/* Шапка с поиском */}
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
                
                {/* Контейнер поиска (как на главной) */}
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

            {/* Уведомление */}
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={hideNotification}
                />
            )}

            <main className={styles.bookMain}>
                {/* Обложка книги */}
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

                {/* Основная информация */}
                <div className={styles.bookInfo}>
                    <h2 className={styles.bookTitle}>{book.title}</h2>

                    {book.seriesTitle && (
                        <div className={styles.bookSeries}>
                            {book.seriesTitle}
                            {book.seriesNumber && ` #${book.seriesNumber}`}
                        </div>
                    )}

                    <div className={styles.bookAuthor}>
                        <span className={styles.authorLabel}>АВТОР:</span>
                        <span className={styles.authorName}>{book.author}</span>
                    </div>

                    {/* Жанры - отдельные теги */}
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

                    {/* Год публикации */}
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

                    {/* Аннотация */}
                    <div className={styles.description}>
                        <h3 className={styles.descriptionTitle}>АННОТАЦИЯ</h3>
                        <p className={styles.descriptionText}>
                            {book.annotation || 'Аннотация отсутствует'}
                        </p>
                    </div>

                    {/* Форма добавления отзыва (старая логика) */}
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

                    {/* Отзывы других пользователей (старая логика) */}
                    {comments.length > 0 && (
                        <div className={styles.commentsSection}>
                            <h3 className={styles.commentsTitle}>ОТЗЫВЫ ЧИТАТЕЛЕЙ</h3>

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
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}