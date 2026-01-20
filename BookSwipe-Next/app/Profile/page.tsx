'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';

// Тип для коллекции пользователя
interface UserCollectionItem {
    id: number;
    bookId: number;
    title: string;
    author: string;
    coverUrl: string;
    status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite' | 'none';
    addedAt: string;
    genres?: string;
    rating?: string;
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
    bookTitle: string;
    bookAuthor: string;
    bookImage: string;
}

const navItems = [
    { icon: '/img/back.png', label: 'Свайп', href: '/', active: true },
];

// Доступные темы
const availableThemes = [
    { id: 'pink-dawn', name: '«Розовый рассвет»' },
    { id: 'night-sky', name: '«Ночной небосвод»' },
    { id: 'dark-forest', name: '«Тёмный лес со светлячками»' }
];

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия',
        nickname: '@никнейм',
        avatar: '/img/ava.jpg',
        dateOfBirth: '00/00/0000',
        theme: '«Розовый рассвет»'
    });
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState<'reading' | 'planned' | 'abandoned' | 'read' | 'favorite'>('reading');

    // Состояния для коллекции и отзывов
    const [userCollection, setUserCollection] = useState<UserCollectionItem[]>([]);
    const [userReviews, setUserReviews] = useState<Comment[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const themeDropdownRef = useRef<HTMLDivElement>(null);

    // Загружаем сохраненные данные из localStorage при монтировании
    useEffect(() => {
        const savedName = localStorage.getItem('userName');
        const savedNickname = localStorage.getItem('userNickname');
        const savedAvatar = localStorage.getItem('userAvatar');
        const savedDateOfBirth = localStorage.getItem('userDateOfBirth');
        const savedTheme = localStorage.getItem('userTheme');

        setUserData(prev => ({
            ...prev,
            name: savedName || prev.name,
            nickname: savedNickname || prev.nickname,
            avatar: savedAvatar || prev.avatar,
            dateOfBirth: savedDateOfBirth || prev.dateOfBirth,
            theme: savedTheme || prev.theme
        }));

        // Загружаем коллекцию книг
        loadUserCollection();

        // Загружаем отзывы пользователя
        loadUserReviews();
    }, []);

    // Загрузка коллекции книг
    const loadUserCollection = () => {
        const savedCollection = localStorage.getItem('userCollection');
        if (savedCollection) {
            try {
                const collection: UserCollectionItem[] = JSON.parse(savedCollection);
                // Сортируем по дате добавления (новые первые)
                collection.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
                setUserCollection(collection);
            } catch (error) {
                console.error('Ошибка при загрузке коллекции:', error);
                setUserCollection([]);
            }
        }
    };

    // Загрузка отзывов пользователя
    const loadUserReviews = () => {
        const savedReviews = localStorage.getItem('userReviews');
        if (savedReviews) {
            try {
                const reviews: Comment[] = JSON.parse(savedReviews);
                // Сортируем по дате (новые первые)
                reviews.sort((a, b) => b.id - a.id);
                setUserReviews(reviews);
            } catch (error) {
                console.error('Ошибка при загрузке отзывов:', error);
                setUserReviews([]);
            }
        }
    };

    // Закрытие выпадающего списка при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
                setShowThemeDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newAvatar = e.target?.result as string;
                setUserData(prev => ({ ...prev, avatar: newAvatar }));
                localStorage.setItem('userAvatar', newAvatar);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserData(prev => ({ ...prev, [id]: value }));
    };

    // Обработчик выбора темы
    const handleThemeSelect = (themeName: string) => {
        setUserData(prev => ({ ...prev, theme: themeName }));
        setShowThemeDropdown(false);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        // Сохраняем данные в localStorage
        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userNickname', userData.nickname);
        localStorage.setItem('userDateOfBirth', userData.dateOfBirth);
        localStorage.setItem('userTheme', userData.theme);

        alert('Профиль успешно обновлен!');
        setIsEditing(false);
    };

    // Фильтрация книг по статусу
    const getBooksByStatus = (status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite') => {
        return userCollection.filter(book => book.status === status);
    };

    // Получение отображаемого названия для статуса
    const getStatusDisplayName = (status: string) => {
        switch (status) {
            case 'reading': return 'Читаю';
            case 'planned': return 'В планах';
            case 'abandoned': return 'Брошено';
            case 'read': return 'Прочитанные';
            case 'favorite': return 'В избранном';
            default: return status;
        }
    };

    if (isEditing) {
        return (
            <div className={styles.container}>
                {/* Верхняя панель редактирования */}
                <div className={styles.topBar}>
                    <span className={styles.backArrow}>
                        <button
                            onClick={() => setIsEditing(false)}
                            className={styles.backButton}
                        >
                            <Image
                                src="/img/back.png"
                                alt="Назад"
                                width={22}
                                height={13}
                                priority
                            />
                        </button>
                    </span>
                    <h1 className={styles.editTitle}>Редактирование</h1>
                </div>
                <div className={styles.avatarBlock}>
                    <div className={styles.avatarContainer}>
                        <div
                            className={styles.avatar}
                            style={{ backgroundImage: `url(${userData.avatar})` }}
                        />
                        <button
                            className={styles.editAvatarButton}
                            onClick={handleAvatarClick}
                        >
                            <Image
                                src="/img/editing.png"
                                alt="Изменить аватар"
                                width={30}
                                height={30}
                            />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className={styles.name}>{userData.name}</div>
                    <div className={styles.nickname}>{userData.nickname}</div>
                </div>

                {/* Форма редактирования */}
                <form onSubmit={handleSave} className={styles.editForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Имя</label>
                        <input
                            type="text"
                            id="name"
                            value={userData.name}
                            onChange={handleInputChange}
                            className={styles.formControl}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="nickname">Nickname</label>
                        <input
                            type="text"
                            id="nickname"
                            value={userData.nickname}
                            onChange={handleInputChange}
                            className={styles.formControl}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="dateOfBirth">Дата рождения</label>
                        <input
                            type="text"
                            id="dateOfBirth"
                            value={userData.dateOfBirth}
                            onChange={handleInputChange}
                            className={styles.formControl}
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="theme">Смена темы</label>
                        <div style={{ position: 'relative' }} ref={themeDropdownRef}>
                            <div
                                className={styles.formControl}
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: '#fff'
                                }}
                                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                            >
                                <span>{userData.theme}</span>
                                <span style={{
                                    transform: showThemeDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s',
                                    fontSize: '12px'
                                }}>
                                    ▼
                                </span>
                            </div>

                            {/* Выпадающий список тем */}
                            {showThemeDropdown && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 1000,
                                    marginTop: '4px'
                                }}>
                                    {availableThemes.map((theme) => (
                                        <div
                                            key={theme.id}
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: userData.theme === theme.name ? '#f8f8f8' : '#fff',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                            onClick={() => handleThemeSelect(theme.name)}
                                        >
                                            <span>{theme.name}</span>
                                            {userData.theme === theme.name && (
                                                <span style={{ color: '#ff8c9d', fontWeight: 'bold' }}>✔</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" className={styles.saveButton}>
                        СОХРАНИТЬ
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className={styles.container}>

            {/* Верхняя панель */}
            <div className={styles.topBar}>
                <span className={styles.backArrow}>
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`${styles.navLink} ${item.active ? styles.active : ''}`}
                        >
                            <Image
                                src="/img/back.png"
                                alt="Логотип"
                                width={22}
                                height={13}
                                className={styles.backArrow}
                                priority
                            />
                        </Link>
                    ))}
                </span>
                <button
                    className={styles.settingsButton}
                    onClick={() => setIsEditing(true)}
                >
                    <Image
                        src="/img/settings.png"
                        alt="Настройки"
                        width={30}
                        height={30}
                        priority
                    />
                </button>
            </div>

            <div className={styles.avatarBlock}>
                <div
                    className={styles.avatar}
                    style={{ backgroundImage: `url(${userData.avatar})` }}
                />
                <div>
                    <div className={styles.name}>{userData.name}</div>
                    <div className={styles.nickname}>{userData.nickname}</div>
                </div>

            </div>

            <div className={styles.sectionTitle}>МОЯ КОЛЛЕКЦИЯ</div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'reading' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('reading')}
                >
                    Читаю ({getBooksByStatus('reading').length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'planned' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('planned')}
                >
                    В планах ({getBooksByStatus('planned').length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'abandoned' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('abandoned')}
                >
                    Брошено ({getBooksByStatus('abandoned').length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'read' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('read')}
                >
                    Прочитанные ({getBooksByStatus('read').length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'favorite' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('favorite')}
                >
                    В избранном ({getBooksByStatus('favorite').length})
                </button>
            </div>

            <div className={styles.special}>
                <div className={styles.popularDestinations}>
                    {getBooksByStatus(activeTab).length > 0 ? (
                        getBooksByStatus(activeTab).map((book) => (
                            <BookCard
                                key={book.id}
                                id={book.bookId}
                                title={book.title}
                                author={book.author}
                                rating={book.rating || '0.0'}
                                imageUrl={book.coverUrl}
                                href={`/book/${book.bookId}`}
                            />
                        ))
                    ) : (
                        <div className={styles.emptyCollection}>
                            <p>В разделе "{getStatusDisplayName(activeTab)}" пока нет книг</p>
                            <p>Добавьте книги через меню на странице книги</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Мои отзывы */}
            <div className={styles.sectionTitle}>МОИ ОТЗЫВЫ</div>

            {userReviews.length > 0 ? (
                <div className={styles.reviewList}>
                    {userReviews.map((review) => (
                        <div key={review.id} className={styles.reviewCard}>
                            <div className={styles.reviewTop}>
                                <div
                                    className={styles.smallAvatar}
                                    style={{ backgroundImage: `url(${userData.avatar})` }}
                                />
                                <div className={styles.reviewInfo}>
                                    <div>{review.date}</div>
                                    <div className={styles.reviewStars}>
                                        {'★'.repeat(review.rating)} {review.rating}/5
                                    </div>
                                </div>
                            </div>

                            <div className={styles.reviewBookInfo}><div>
                                {review.text}
                            </div>

                            </div>

                            <div className={styles.reviewText}>
                                <div className={styles.reviewBookTitle}>{review.bookTitle}</div>
                                <div className={styles.reviewBookAuthor}>{review.bookAuthor}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyReviews}>
                    <p>У вас пока нет отзывов</p>
                    <p>Оставьте свой первый отзыв на странице книги!</p>
                </div>
            )}

        </div>
    );
}