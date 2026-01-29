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
        console.log('No user email in localStorage'); 
        return null;
    }

    // ПРОВЕРКА КЭША: используем кэшированный ID если он есть
    const cachedUserId = localStorage.getItem('userId');
    if (cachedUserId) {
        console.log('Using cached user ID:', cachedUserId); 
        return parseInt(cachedUserId);
    }

    try {
        console.log('Getting user ID for email:', userEmail); 

        // ПОПЫТКА 1: Основной эндпоинт
        const response = await fetch('/api/user/id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data); 

        if (data.success && data.userId) {
            const userId = data.userId;
            console.log('Found user ID:', userId); 
            localStorage.setItem('userId', userId.toString()); // Кэшируем
            return userId;
        }

        // ПОПЫТКА 2: Fallback эндпоинт (если первый не сработал)
        console.log('Trying fallback: /api/user/profile'); 
        const fallbackResponse = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);

        if (fallbackResponse.ok) {
            const profileData = await fallbackResponse.json();
            console.log('Fallback response:', profileData); 

            if (profileData.success && profileData.user && profileData.user.id) {
                const userId = profileData.user.id;
                console.log('Found user ID from profile:', userId); 
                localStorage.setItem('userId', userId.toString()); // Кэшируем
                return userId;
            }
        }

        console.error('User not found in any endpoint'); 
        return null;

    } catch (error) {
        console.error('Error getting user ID:', error); 
        return null;
    }
}

async function saveToCollectionDB(userId: number, bookId: number, status: string): Promise<boolean> {
    try {
        console.log('Saving to collection DB:', { userId, bookId, status });

        const response = await fetch('/api/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId, // Явное указание ключа
                bookId: bookId,
                collectionType: status
            })
        });

        console.log('API Response status:', response.status); 

        const data = await response.json();
        console.log('API Response data:', data); 

        if (response.ok && data.success) {
            console.log('Successfully saved to collection'); 
            return true;
        } else {
            console.error('Failed to save:', data); 
            return false;
        }
    } catch (error) {
        console.error('Error in saveToCollectionDB:', error); 
        return false;
    }
}

async function removeFromCollectionDB(userId: number, bookId: number): Promise<boolean> {
    try {
        console.log('Removing from collection DB:', { userId, bookId });

        const response = await fetch('/api/collection/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                bookId
            })
        });

        console.log(' Remove response status:', response.status);

        const data = await response.json();
        console.log('Remove response data:', data);

        return data.success || false;
    } catch (error) {
        console.error('Error in removeFromCollectionDB:', error);
        return false;
    }
}

async function checkBookStatus(userId: number, bookId: string): Promise<string> {
    try {
        console.log('Checking book status:', { userId, bookId }); 

        const response = await fetch(`/api/collection/check?userId=${userId}&bookId=${bookId}`);

        console.log('Check status response:', response.status); 

        if (response.ok) {
            const data = await response.json();
            console.log('Check status data:', data); 

            if (data.success && data.inCollection && data.collectionType) {
                console.log('Book found in collection:', data.collectionType); 
                return data.collectionType;
            }
        }

        console.log('Book not in collection'); 
        return 'none';
    } catch (error) {
        console.error('Error checking book status:', error); 
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

    // Обработчик обновления профиля
    // Обработчик обновления профиля
    const handleProfileUpdate = (event: CustomEvent) => {
        console.log('Profile updated event received:', event.detail); 
        const { name, avatar } = event.detail;

        if (name || avatar) {
            setUserData(prev => ({
                ...prev,
                name: name || prev.name,
                avatar: avatar || prev.avatar
            }));

            // ОБНОВЛЯЕМ localStorage при получении события
            if (name) {
                localStorage.setItem('userName', name);
                console.log('Updated userName in localStorage:', name); 
            }
            if (avatar) {
                localStorage.setItem('userAvatar', avatar);
                console.log('Updated userAvatar in localStorage'); 
            }
        }
    };

    useEffect(() => {
        // ВСЕГДА берем СВЕЖИЕ данные из localStorage при загрузке
        const savedName = localStorage.getItem('userName') || 'Имя Фамилия';
        const savedAvatar = localStorage.getItem('userAvatar') || '/img/ava.jpg';
        const savedUserId = localStorage.getItem('userId') || 'current-user';

        console.log('Loading fresh user data:', { 
            name: savedName,
            avatar: savedAvatar ? '✅' : '❌', // Визуальный индикатор
            userId: savedUserId
        });

        setUserData({
            name: savedName,
            avatar: savedAvatar,
            userId: savedUserId
        });

        loadBook();
        loadAllBooks();
        loadComments();

        // ПОДПИСКА НА СОБЫТИЯ обновления профиля
        window.addEventListener('profile-updated', handleProfileUpdate as EventListener);

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('mousedown', handleMenuClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousedown', handleMenuClickOutside);
            // ОТПИСКА ОТ СОБЫТИЙ при размонтировании
            window.removeEventListener('profile-updated', handleProfileUpdate as EventListener);
        };
    }, [params.id]);

    useEffect(() => {
        if (book) {
            console.log('Book loaded, checking status for:', book.title);
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
            console.log('No book ID'); 
            setBookStatus('none');
            return;
        }

        setIsLoadingStatus(true);

        console.log('Loading book status for book ID:', bookId); 
        const userId = await getUserId();

        if (!userId) {
            console.log('No user ID found'); 
            setBookStatus('none');
            setIsLoadingStatus(false);
            return;
        }

        try {
            const status = await checkBookStatus(userId, bookId as string);
            console.log('Book status result:', status); 

            if (status === 'reading') setBookStatus('reading');
            else if (status === 'planned') setBookStatus('planned');
            else if (status === 'abandoned') setBookStatus('abandoned');
            else if (status === 'read') setBookStatus('read');
            else if (status === 'favorite') setBookStatus('favorite');
            else setBookStatus('none');
        } catch (error) {
            console.error('Error loading book status:', error); 
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
                // УДАЛЕНА сортировка по ID - теперь порядок сохранения в localStorage
                setComments(bookComments);
            } catch (error) {
                setComments([]);
            }
        }
    };

    const saveToCollection = async (status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite') => {
        if (!book) {
            console.log('No book to save'); 
            return;
        }

        console.log('Starting save to collection:', {
            bookId: book.id,
            bookTitle: book.title,
            status: status
        });

        try {
            const userId = await getUserId();
            console.log('Got userId:', userId); 

            if (!userId) {
                showNotification('Ошибка: пользователь не найден. Войдите в систему.', 'error');
                return;
            }

            console.log('Calling saveToCollectionDB...'); 
            const savedInDB = await saveToCollectionDB(userId, book.id, status);
            console.log('saveToCollectionDB result:', savedInDB); 

            if (savedInDB) {
                console.log('Reloading book status...'); 
                await loadBookStatus();
                setShowMenu(false);

                // ОТПРАВЛЯЕМ ДВА СОБЫТИЯ для обновления других компонентов
                window.dispatchEvent(new CustomEvent('recommendations-updated'));
                window.dispatchEvent(new CustomEvent('collection-updated')); // НОВОЕ СОБЫТИЕ

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
            console.error('Error in saveToCollection:', error); 
            showNotification('Произошла ошибка при сохранении', 'error');
        }
    };

    const removeFromCollection = async () => {
        if (!book) return;

        console.log('Removing book from collection:', book.title); 

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

                // ОТПРАВЛЯЕМ ДВА СОБЫТИЯ
                window.dispatchEvent(new CustomEvent('recommendations-updated'));
                window.dispatchEvent(new CustomEvent('collection-updated')); // НОВОЕ СОБЫТИЕ

                showNotification('Книга удалена из коллекции', 'success');
            } else {
                showNotification('Не удалось удалить из коллекции', 'error');
            }
        } catch (error) {
            console.error('Error removing from collection:', error); 
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
            // ВСЕГДА берем СВЕЖИЕ данные из localStorage
            const currentUserName = localStorage.getItem('userName') || 'Имя Фамилия';
            const currentUserAvatar = localStorage.getItem('userAvatar') || '/img/ava.jpg';
            const currentUserId = localStorage.getItem('userId') || 'current-user';

            console.log('Creating comment with fresh user data:', { 
                name: currentUserName,
                avatar: currentUserAvatar ? '✅' : '❌', // Визуальный индикатор
                userId: currentUserId
            });

            const newComment: Comment = {
                id: Date.now(),
                bookId: book.id,
                userId: currentUserId,
                userName: currentUserName,
                userAvatar: currentUserAvatar, // СВЕЖИЙ аватар из localStorage!
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

            // УДАЛЯЕМ СТАРЫЙ отзыв этого пользователя на эту книгу
            const filteredBookComments = allBookComments.filter(
                (comment: Comment) => !(comment.bookId === book.id && comment.userId === currentUserId)
            );

            filteredBookComments.unshift(newComment);
            const limitedBookComments = filteredBookComments.slice(0, 1000);
            localStorage.setItem('bookComments', JSON.stringify(limitedBookComments));

            // Сохраняем также в профиль пользователя
            const userReviews = localStorage.getItem('userReviews');
            const reviews = userReviews ? JSON.parse(userReviews) : [];

            const filteredUserReviews = reviews.filter(
                (review: Comment) => !(review.bookId === book.id && review.userId === currentUserId)
            );

            filteredUserReviews.unshift(newComment);
            const limitedUserReviews = filteredUserReviews.slice(0, 100);
            localStorage.setItem('userReviews', JSON.stringify(limitedUserReviews));

            // Обновляем состояние
            setComments([newComment, ...comments.filter(c => !(c.bookId === book.id && c.userId === currentUserId))]);
            setCommentText('');
            setUserRating(0);
            setHoverRating(0);

            showNotification('Спасибо за ваш отзыв! Отзыв успешно опубликован и сохранен в профиле.');
        } catch (error) {
            console.error('Error saving comment:', error); 
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
                                        <span style={{ fontSize: '14px' }}></span>
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