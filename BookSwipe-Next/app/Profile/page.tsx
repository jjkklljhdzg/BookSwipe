'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';
import Notification from '@/components/Notification/Notification';
import { useRouter } from 'next/navigation';

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
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);
    const [userCollection, setUserCollection] = useState<UserCollectionItem[]>([]);
    const [userReviews, setUserReviews] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const themeDropdownRef = useRef<HTMLDivElement>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

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
            } else {
                console.warn('No collection data received');
                setUserCollection([]);
            }
        } catch (error) {
            console.error('Error loading collection from API:', error);
            setUserCollection([]);
        }
    };

    const loadUserReviewsFromDB = async () => {
        if (!userId) {
            console.log('No userId, cannot load reviews from DB');
            setUserReviews([]);
            return;
        }

        try {
            console.log('Loading reviews from DB for user ID:', userId);
            
            const response = await fetch(`/api/reviews?userId=${userId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to load reviews from DB:', errorText);
                setUserReviews([]);
                return;
            }

            const data = await response.json();
            console.log('Reviews API response:', data);

            if (data.success && data.reviews) {
                // Форматируем отзывы из БД в формат Comment
                const formattedReviews: Comment[] = data.reviews.map((review: any) => {
                    // Форматируем дату
                    const reviewDate = review.created_at || review.date;
                    let formattedDate;
                    if (reviewDate) {
                        try {
                            formattedDate = new Date(reviewDate).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                        } catch (e) {
                            formattedDate = reviewDate;
                        }
                    } else {
                        formattedDate = 'Дата неизвестна';
                    }

                    return {
                        id: review.id,
                        bookId: review.bookId || review.book_id,
                        userId: userId.toString(),
                        userName: userData.name || review.userName || 'Пользователь',
                        userAvatar: userData.avatar || '/img/ava.jpg',
                        rating: review.rating,
                        text: review.text || '',
                        date: formattedDate,
                        bookTitle: review.bookTitle || 'Без названия',
                        bookAuthor: review.bookAuthor || 'Неизвестный автор',
                        bookImage: review.bookImage || review.bookImage || '/img/default-book.jpg'
                    };
                });

                // Сортируем по дате (новые сначала)
                formattedReviews.sort((a, b) => {
                    try {
                        const dateA = new Date(a.date.split('.').reverse().join('-'));
                        const dateB = new Date(b.date.split('.').reverse().join('-'));
                        return dateB.getTime() - dateA.getTime();
                    } catch (e) {
                        return b.id - a.id;
                    }
                });

                console.log('Loaded reviews from DB:', formattedReviews.length, 'items');
                setUserReviews(formattedReviews);
            } else {
                console.warn('No reviews data received from DB');
                setUserReviews([]);
            }
        } catch (error) {
            console.error('Error loading reviews from DB:', error);
            setUserReviews([]);
        }
    };

    const getUserIdByEmail = async (email: string): Promise<number | null> => {
        try {
            const response = await fetch('/api/user/id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data.success && data.userId) {
                return data.userId;
            }
            
            return null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    };

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
                        localStorage.setItem('userId', userId.toString());
                        
                        await loadUserCollection();
                        await loadUserReviewsFromDB();
                    } else if (data.success && data.name) {
                        const userId = await getUserIdByEmail(userEmail);
                        const avatar = data.avatar || userAvatar || '/img/ava.jpg';
                        const name = data.name || userName || userEmail.split('@')[0] || 'Пользователь';

                        if (userId) {
                            setUserId(userId);
                            localStorage.setItem('userId', userId.toString());
                        }
                        
                        setUserData(prev => ({
                            ...prev,
                            name: name,
                            nickname: `@${name.toLowerCase().replace(/\s+/g, '')}`,
                            avatar: avatar
                        }));

                        localStorage.setItem('userName', name);
                        localStorage.setItem('userAvatar', avatar);
                        
                        if (userId) {
                            await loadUserCollection();
                            await loadUserReviewsFromDB();
                        }
                    }
                } else {
                    // Fallback к localStorage данным
                    const name = userName || userEmail.split('@')[0] || 'Пользователь';
                    const avatar = userAvatar || '/img/ava.jpg';
                    
                    setUserData(prev => ({
                        ...prev,
                        name: name,
                        nickname: `@${name.toLowerCase().replace(/\s+/g, '')}`,
                        avatar: avatar
                    }));

                    const userId = localStorage.getItem('userId');
                    if (userId) {
                        setUserId(parseInt(userId));
                        await loadUserCollection();
                        await loadUserReviewsFromDB();
                    }
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                // Fallback к localStorage данным
                const name = userName || userEmail.split('@')[0] || 'Пользователь';
                const avatar = userAvatar || '/img/ava.jpg';
                
                setUserData(prev => ({
                    ...prev,
                    name: name,
                    nickname: `@${name.toLowerCase().replace(/\s+/g, '')}`,
                    avatar: avatar
                }));

                const userId = localStorage.getItem('userId');
                if (userId) {
                    setUserId(parseInt(userId));
                    await loadUserCollection();
                    await loadUserReviewsFromDB();
                }
            }

            setIsLoading(false);
        };

        checkAuthAndLoadData();
        
        const handleCollectionUpdate = () => {
            console.log('Collection update detected, refreshing...');
            if (userId) {
                loadUserCollection();
            }
        };

        const handleReviewsUpdate = () => {
            console.log('Reviews update detected, refreshing...');
            if (userId) {
                loadUserReviewsFromDB();
            }
        };
        
        window.addEventListener('collectionUpdated', handleCollectionUpdate);
        window.addEventListener('reviewsUpdated', handleReviewsUpdate);
        
        return () => {
            window.removeEventListener('collectionUpdated', handleCollectionUpdate);
            window.removeEventListener('reviewsUpdated', handleReviewsUpdate);
        };
    }, [router]);

    useEffect(() => {
        if (userId) {
            console.log('UserId changed to:', userId, ', loading collection and reviews...');
            loadUserCollection();
            loadUserReviewsFromDB();
        }
    }, [userId]);

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
            localStorage.removeItem('userId');
            
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

    const getBooksByStatus = (status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite') => {
        return userCollection.filter(book => book.status === status);
    };

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
                                    style={{ backgroundImage: `url(${review.userAvatar || userData.avatar})` }}
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