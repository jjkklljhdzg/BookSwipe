'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';
import Notification from '@/components/Notification/Notification';
import { useRouter } from 'next/navigation';

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

// Тип для профиля пользователя
interface ProfileResponse {
    success: boolean;
    user?: {
        id: number;
        email: string;
        name: string;
        avatar: string;
    };
    name?: string;
    avatar?: string;
}

// Тип для комментария (оставлю, но можно удалить)
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
    { icon: '/img/back.png', label: 'Свайп', href: '/Main', active: true },
];

// Доступные темы
const availableThemes = [
    { id: 'pink-dawn', name: '«Розовый рассвет»' },
    { id: 'night-sky', name: '«Ночной небосвод»' },
    { id: 'dark-forest', name: '«Тёмный лес со светлячками»' }
];

export default function ProfilePage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState('');
    const [userId, setUserId] = useState<number | null>(null);
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

    // Добавляем состояние для уведомлений
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);

    // Состояния для коллекции и отзывов
    const [userCollection, setUserCollection] = useState<UserCollectionItem[]>([]);
    const [userReviews, setUserReviews] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const themeDropdownRef = useRef<HTMLDivElement>(null);

    // Функции для уведомлений
    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

    // Загрузка коллекции книг из БД
    const loadUserCollection = async () => {
        if (!userId) {
            console.log('No userId, cannot load collection');
            return;
        }

        try {
            console.log('Loading collection for user ID:', userId);
            
            const response = await fetch(`/api/collection/get?userId=${userId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to load collection:', errorText);
                throw new Error(`Failed to load collection: ${response.status}`);
            }

            const data = await response.json();
            console.log('Collection API response:', data);

            if (data.success && data.collection) {
                const collection: UserCollectionItem[] = data.collection.map((item: any) => ({
                    id: item.id,
                    bookId: item.book_id,
                    title: item.title || 'Без названия',
                    author: item.author || 'Неизвестный автор',
                    coverUrl: item.cover_url || '/img/default-book.jpg',
                    status: item.collection_type || 'none',
                    addedAt: item.created_at || new Date().toISOString(),
                    genres: item.genres || '',
                    rating: item.rating || '0.0'
                }));

                console.log('Processed collection:', collection.length, 'items');
                
                setUserCollection(collection);
                
                // Сохраняем в localStorage для офлайн-доступа
                localStorage.setItem('userCollection', JSON.stringify(collection));
            } else {
                console.warn('No collection data received');
                // Fallback to localStorage
                const savedCollection = localStorage.getItem('userCollection');
                if (savedCollection) {
                    try {
                        const collection: UserCollectionItem[] = JSON.parse(savedCollection);
                        collection.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
                        setUserCollection(collection);
                    } catch (error) {
                        console.error('Error parsing localStorage collection:', error);
                        setUserCollection([]);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading collection from API:', error);
            // Fallback to localStorage
            const savedCollection = localStorage.getItem('userCollection');
            if (savedCollection) {
                try {
                    const collection: UserCollectionItem[] = JSON.parse(savedCollection);
                    collection.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
                    setUserCollection(collection);
                } catch (e) {
                    console.error('Error parsing localStorage collection:', e);
                    setUserCollection([]);
                }
            }
        }
    };

    // Загрузка отзывов пользователя (можно удалить, если не используется)
    const loadUserReviews = () => {
        const savedReviews = localStorage.getItem('userReviews');
        if (savedReviews) {
            try {
                const reviews: Comment[] = JSON.parse(savedReviews);
                reviews.sort((a, b) => b.id - a.id);
                setUserReviews(reviews);
            } catch (error) {
                console.error('Error loading reviews:', error);
                setUserReviews([]);
            }
        }
    };

    // Получение ID пользователя по email
    const getUserIdByEmail = async (email: string): Promise<number | null> => {
        try {
            const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
            if (!response.ok) return null;
            
            const data: ProfileResponse = await response.json();
            
            if (data.success && data.user && data.user.id) {
                return data.user.id;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    };

    // Основной эффект загрузки данных
    useEffect(() => {
        const checkAuthAndLoadData = async () => {
            if (typeof window === 'undefined') return;

            const isLoggedIn = localStorage.getItem('isLoggedIn');
            const userEmail = localStorage.getItem('userEmail');
            const userName = localStorage.getItem('userName');
            const userAvatar = localStorage.getItem('userAvatar');

            if (!isLoggedIn || !userEmail) {
                router.push('/Login');
                return;
            }

            setUserEmail(userEmail);

            try {
                const response = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data: ProfileResponse = await response.json();

                    if (data.success && data.user) {
                        const userId = data.user.id;
                        const avatar = data.user.avatar || userAvatar || '/img/ava.jpg';
                        const name = data.user.name || userName || userEmail.split('@')[0] || 'Пользователь';

                        setUserId(userId);
                        setUserData(prev => ({
                            ...prev,
                            name: name,
                            nickname: `@${name.toLowerCase().replace(/\s+/g, '')}`,
                            avatar: avatar
                        }));

                        localStorage.setItem('userName', name);
                        localStorage.setItem('userAvatar', avatar);
                        
                        // Загружаем коллекцию после получения ID
                        await loadUserCollection();
                    } else if (data.success && data.name) {
                        // Получаем ID отдельно
                        const userId = await getUserIdByEmail(userEmail);
                        const avatar = data.avatar || userAvatar || '/img/ava.jpg';
                        const name = data.name || userName || userEmail.split('@')[0] || 'Пользователь';

                        if (userId) setUserId(userId);
                        
                        setUserData(prev => ({
                            ...prev,
                            name: name,
                            nickname: `@${name.toLowerCase().replace(/\s+/g, '')}`,
                            avatar: avatar
                        }));

                        localStorage.setItem('userName', name);
                        localStorage.setItem('userAvatar', avatar);
                        
                        if (userId) await loadUserCollection();
                        else fallbackToLocalStorage(userEmail, userName, userAvatar);
                    } else {
                        fallbackToLocalStorage(userEmail, userName, userAvatar);
                    }
                } else {
                    fallbackToLocalStorage(userEmail, userName, userAvatar);
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                fallbackToLocalStorage(userEmail, userName, userAvatar);
            }

            // Загружаем отзывы (можно удалить если не используются)
            loadUserReviews();

            setIsLoading(false);
        };

        const fallbackToLocalStorage = async (email: string, userName: string | null, userAvatar: string | null) => {
            const userId = await getUserIdByEmail(email);
            if (userId) setUserId(userId);
            
            setUserData(prev => ({
                ...prev,
                name: userName || email.split('@')[0] || 'Пользователь',
                nickname: `@${(userName || email.split('@')[0] || 'user')
                    .toLowerCase()
                    .replace(/\s+/g, '')}`,
                avatar: userAvatar || '/img/ava.jpg'
            }));
            
            if (userId) await loadUserCollection();
        };

        checkAuthAndLoadData();
    }, [router]);

    // Обновляем коллекцию при изменении userId или activeTab
    useEffect(() => {
        if (userId) {
            loadUserCollection();
        }
    }, [userId]);

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

    const handleLogout = async () => {
        try {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userAvatar');
            localStorage.removeItem('userCollection');
            localStorage.removeItem('userReviews');

            showNotification('Вы успешно вышли из аккаунта');

            setTimeout(() => {
                router.push('/Login');
            }, 1000);

        } catch (error) {
            showNotification('Ошибка при выходе', 'error');
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && userEmail) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const newAvatar = e.target?.result as string;
                
                setUserData(prev => ({ ...prev, avatar: newAvatar }));
                localStorage.setItem('userAvatar', newAvatar);

                try {
                    const response = await fetch('/api/user/avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: userEmail,
                            avatar: newAvatar
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        showNotification('Аватар обновлен');
                        if (data.avatar) {
                            setUserData(prev => ({ ...prev, avatar: data.avatar }));
                            localStorage.setItem('userAvatar', data.avatar);
                        }
                    } else {
                        const errorMessage = data.message || data.error || 'Ошибка при обновлении аватара';
                        showNotification(errorMessage, 'error');
                    }
                } catch (error) {
                    showNotification('Ошибка сети при сохранении аватара', 'error');
                }
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

        try {
            localStorage.setItem('userTheme', themeName);
            showNotification(`Тема "${themeName}" применена!`);
        } catch (error) {
            showNotification('Ошибка при сохранении темы', 'error');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (!userEmail) {
                showNotification('Email не найден', 'error');
                return;
            }

            showNotification('Сохранение профиля...', 'info');

            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    name: userData.name,
                    avatar: userData.avatar
                })
            });

            const textResponse = await response.text();
            let data;
            
            try {
                data = JSON.parse(textResponse);
            } catch (parseError) {
                showNotification('Ошибка в формате ответа сервера', 'error');
                return;
            }

            if (response.ok) {
                if (data.success) {
                    const nickname = `@${userData.name.toLowerCase().replace(/\s+/g, '')}`;
                    setUserData(prev => ({ ...prev, nickname }));
                    
                    localStorage.setItem('userName', userData.name);
                    localStorage.setItem('userAvatar', userData.avatar);
                    
                    showNotification('Профиль успешно сохранен');
                    
                    setTimeout(() => {
                        setIsEditing(false);
                    }, 1000);
                } else {
                    const errorMessage = data.message || data.error || 'Ошибка сервера';
                    showNotification(errorMessage, 'error');
                }
            } else {
                showNotification(`Ошибка сервера: ${response.status}`, 'error');
            }

        } catch (error: any) {
            showNotification(`Ошибка сети: ${error.message || 'Не удалось подключиться к серверу'}`, 'error');
        }
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

    // Функция для удаления книги из коллекции
    const handleRemoveFromCollection = async (bookId: number) => {
        if (!userId) {
            showNotification('Пользователь не найден', 'error');
            return;
        }

        try {
            const response = await fetch('/api/collection/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    bookId: bookId
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Обновляем локальное состояние
                setUserCollection(prev => prev.filter(book => book.bookId !== bookId));
                
                // Обновляем localStorage
                const updatedCollection = userCollection.filter(book => book.bookId !== bookId);
                localStorage.setItem('userCollection', JSON.stringify(updatedCollection));
                
                showNotification('Книга удалена из коллекции');
            } else {
                showNotification(data.error || 'Ошибка при удалении книги', 'error');
            }
        } catch (error) {
            console.error('Error removing book from collection:', error);
            showNotification('Ошибка сети при удалении книги', 'error');
        }
    };

    // Функция для обновления статуса книги
    const handleUpdateBookStatus = async (bookId: number, newStatus: UserCollectionItem['status']) => {
        if (!userId) {
            showNotification('Пользователь не найден', 'error');
            return;
        }

        try {
            const response = await fetch('/api/collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    bookId: bookId,
                    collectionType: newStatus
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Обновляем локальное состояние
                setUserCollection(prev => 
                    prev.map(book => 
                        book.bookId === bookId 
                            ? { ...book, status: newStatus }
                            : book
                    )
                );
                
                showNotification(`Книга перемещена в "${getStatusDisplayName(newStatus)}"`);
            } else {
                showNotification(data.error || 'Ошибка при обновлении статуса', 'error');
            }
        } catch (error) {
            console.error('Error updating book status:', error);
            showNotification('Ошибка сети при обновлении статуса', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <p>Загрузка профиля...</p>
                </div>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className={styles.container}>
                {notification && (
                    <Notification
                        message={notification.message}
                        type={notification.type}
                        onClose={hideNotification}
                    />
                )}

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
                        <label htmlFor="dateOfBirth">Дата рождения</label>
                        <input
                            type="text"
                            id="dateOfBirth"
                            value={userData.dateOfBirth}
                            onChange={handleInputChange}
                            className={styles.formControl}
                            placeholder="дд/мм/гггг"
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
                    <button
                        type="button"
                        className={styles.logoutButton}
                        onClick={handleLogout}
                    >
                        ВЫЙТИ
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={hideNotification}
                />
            )}

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
                <div className={styles.topBarButtons}>
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
                            <div key={book.id} className={styles.bookCardWrapper}>
                                <BookCard
                                    id={book.bookId}
                                    title={book.title}
                                    author={book.author}
                                    rating={book.rating || '0.0'}
                                    imageUrl={book.coverUrl}
                                    href={`/book/${book.bookId}`}
                                />
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyCollection}>
                            <p>В разделе "{getStatusDisplayName(activeTab)}" пока нет книг</p>
                            <p>Добавьте книги через меню на странице книги</p>
                        </div>
                    )}
                </div>
            </div>

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

                            <div className={styles.reviewBookInfo}>
                                <div>
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