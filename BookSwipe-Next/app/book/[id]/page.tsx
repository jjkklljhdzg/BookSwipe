'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './book.module.css';
import BottomNav from '@/components/BottomNav/page';
import Notification from '@/components/Notification/Notification'; // Добавлен импорт

// Тип для данных книги
interface Book {
    id: number;
    title: string;
    author: string;
    series?: string;
    genre: string;
    year: number;
    pages: number;
    rating: number;
    price: number;
    description: string;
    fullDescription: string;
    imageUrl: string;
}

// Тип для комментария
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

// Заглушка вместо реальной бд
const bookDatabase: Book[] = [
    {
        id: 1,
        title: 'Название книги 1',
        author: 'Автор 1',
        series: 'Серия книг #1',
        genre: 'Фэнтези',
        year: 2023,
        pages: 320,
        rating: 4.4,
        price: 499.00,
        description: 'Краткое описание книги...',
        fullDescription: 'Полное описание книги. Это увлекательная история о приключениях, магии и дружбе. Книга содержит множество интересных поворотов сюжета и глубоких персонажей. Идеально подходит для любителей фэнтези и приключенческой литературы.',
        imageUrl: '/img/design4.jpg'
    },
    {
        id: 2,
        title: 'Название книги 2',
        author: 'Автор 2',
        genre: 'Детектив',
        year: 2022,
        pages: 280,
        rating: 4.7,
        price: 399.00,
        description: 'Захватывающий детектив...',
        fullDescription: 'Детективная история с множеством загадок и неожиданной развязкой. Главный герой - опытный следователь, который расследует сложное дело. Книга держит в напряжении до последней страницы.',
        imageUrl: '/img/design2.jpg'
    },
    {
        id: 3,
        title: 'Название книги 3',
        author: 'Автор 3',
        series: 'Трилогия #3',
        genre: 'Научная фантастика',
        year: 2024,
        pages: 450,
        rating: 4.9,
        price: 599.00,
        description: 'Футуристическая антиутопия...',
        fullDescription: 'Научно-фантастический роман о будущем человечества. Исследует вопросы искусственного интеллекта, этики технологий и судьбы человечества в мире высоких технологий.',
        imageUrl: '/img/design1.jpg'
    },
    // Добавьте остальные книги из ваших данных
    {
        id: 4,
        title: 'Название',
        author: 'Автор',
        genre: 'Роман',
        year: 2023,
        pages: 300,
        rating: 4.4,
        price: 0.00,
        description: 'Описание книги...',
        fullDescription: 'Полное описание этой интересной книги.',
        imageUrl: '/img/vogue1design.jpg'
    },
    {
        id: 5,
        title: 'Название',
        author: 'Автор',
        genre: 'Драма',
        year: 2022,
        pages: 250,
        rating: 4.4,
        price: 0.00,
        description: 'Описание книги...',
        fullDescription: 'Полное описание этой интересной книги.',
        imageUrl: '/img/vogue2design.jpg'
    },
];

// Компонент рейтинга звездами
const StarRating = ({
    rating, //текущая оценка пользователя
    onRatingChange, //функция, вызываемая при клике на звезду
    hoverRating, //оценка при наведении мыши
    onHoverChange //функция при наведении/снятии с звезды
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
    const params = useParams(); // Получает параметры URL: /book/[id] → { id: "1" }
    const router = useRouter(); // Для программной навигации (редиректы)
    const [book, setBook] = useState<Book | null>(null); // Текущая книга
    const [isInCollection, setIsInCollection] = useState(false); // В коллекции?
    const [isLoading, setIsLoading] = useState(true); // Идёт загрузка?

    // Состояния для комментариев и рейтинга
    const [userRating, setUserRating] = useState(0); // Оценка пользователя
    const [hoverRating, setHoverRating] = useState(0); // Временная оценка при наведении
    const [commentText, setCommentText] = useState(''); // Текст комментария
    const [comments, setComments] = useState<Comment[]>([]); // Все комментарии к книге
    const [userData, setUserData] = useState({ // Данные пользователя 
        name: 'Имя Фамилия',
        avatar: '/img/ava.jpg'
    });
    
    // Состояние для уведомлений
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);

    useEffect(() => {
        // Загружаем данные пользователя
        const savedName = localStorage.getItem('userName') || 'Имя Фамилия';
        const savedAvatar = localStorage.getItem('userAvatar') || '/img/ava.jpg';

        setUserData({
            name: savedName,
            avatar: savedAvatar
        });

        const bookId = parseInt(params.id as string); // Получаем id книги
        const foundBook = bookDatabase.find(b => b.id === bookId); // Ищем книгу в "базе данных"

        if (foundBook) {
            setBook(foundBook);
            // Проверяем, есть ли книга в коллекции (из localStorage)
            const collection = localStorage.getItem('userCollection');
            if (collection) {
                const collectionArray = JSON.parse(collection);
                setIsInCollection(collectionArray.includes(bookId));
            }

            // Загружаем комментарии из localStorage
            loadComments(bookId);
        } else {
            // Если книга не найдена, перенаправляет на главную
            router.push('/');
        }

        setIsLoading(false);
    }, [params.id, router]);

    const loadComments = (bookId: number) => {
        const savedComments = localStorage.getItem('bookComments');
        if (savedComments) {
            const allComments: Comment[] = JSON.parse(savedComments);
            const bookComments = allComments.filter(comment => comment.bookId === bookId);
            setComments(bookComments);
        }
    };

    // Функции для управления уведомлениями
    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault(); // Предотвращаем перезагрузку страницы

        // Проверяем, что всё заполнено
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
            // Создаём объект комментария
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
            
            // Сохраняем в localStorage
            const savedComments = localStorage.getItem('bookComments');
            const allComments = savedComments ? JSON.parse(savedComments) : [];
            allComments.push(newComment);
            localStorage.setItem('bookComments', JSON.stringify(allComments));

            // Также сохраняем в профиль пользователя
            const userReviews = localStorage.getItem('userReviews');
            const reviews = userReviews ? JSON.parse(userReviews) : [];
            reviews.push({
                ...newComment,
                bookTitle: book.title,
                bookAuthor: book.author,
                bookImage: book.imageUrl
            });
            localStorage.setItem('userReviews', JSON.stringify(reviews));

            // Обновляем состояние
            setComments([newComment, ...comments]); // Новый комментарий в начало
            setCommentText(''); // Очищаем текстовое поле
            setUserRating(0); // Сбрасываем оценку
            setHoverRating(0); // Сбрасываем hover-оценку

            showNotification('Спасибо за ваш отзыв! Отзыв успешно опубликован.');
        } catch (error) {
            console.error('Ошибка при сохранении отзыва:', error);
            showNotification('Произошла ошибка при сохранении отзыва', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка...</div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>Книга не найдена</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Шапка */}
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
                            src="/img/poisk.svg"
                            alt="Поиск"
                            width={20}
                            height={20}
                            className={styles.searchIcon}
                        />
                    </button>
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
                        src={book.imageUrl}
                        alt={book.title}
                        width={200}
                        height={300}
                        className={styles.coverImage}
                        priority
                    />
                </div>

                {/* Основная информация */}
                <div className={styles.bookInfo}>
                    <h2 className={styles.bookTitle}>{book.title}</h2>

                    {book.series && (
                        <div className={styles.bookSeries}>
                            {book.series}
                        </div>
                    )}

                    <div className={styles.bookAuthor}>
                        <span className={styles.authorLabel}>АВТОР:</span>
                        <span className={styles.authorName}>{book.author}</span>
                    </div>

                    {/* Жанр */}
                    <div className={styles.genreSection}>
                        <div className={styles.genreTag}>
                            {book.genre}
                        </div>
                    </div>

                    {/* Описание */}
                    <div className={styles.description}>
                        <h3 className={styles.descriptionTitle}>ОПИСАНИЕ</h3>
                        <p className={styles.descriptionText}>{book.fullDescription}</p>
                    </div>

                    {/* Форма добавления отзыва */}
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

                    {/* Отзывы других пользователей */}
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