// profile/page.tsx
'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useEffect } from 'react';
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
    status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite';
    addedAt: string;
    genres?: string;
    rating?: string;
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

async function loadUserCollectionFromDB(userId: number): Promise<UserCollectionItem[]> {
  try {
    const response = await fetch(`/api/collection/get?userId=${userId}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.collection) {
        return data.collection.map((item: any) => ({
          id: item.id,
          bookId: item.book_id,
          title: item.title,
          author: item.author,
          coverUrl: item.cover_url || '/img/default-book.jpg',
          status: item.collection_type,
          addedAt: item.created_at,
          genres: item.genres || '',
          rating: item.rating || '0.0'
        }));
      }
    }
    return [];
  } catch (error) {
    return [];
  }
}

export default function ProfilePage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState('');
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

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

    // Добавьте эту функцию для обработки изменений в форме
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserData(prev => ({ ...prev, [id]: value }));
    };

    useEffect(() => {
        const checkAuthAndLoadData = async () => {
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
                const response = await fetch('/api/user/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });

                if (response.ok) {
                    const userData = await response.json();
                    
                    const avatar = userData.avatar_url || userData.avatar || userAvatar || '/img/ava.jpg';
                    const nameFromDB = userData.nickname || userData.name;

                    setUserData(prev => ({
                        ...prev,
                        name: nameFromDB || userName || userEmail.split('@')[0] || 'Пользователь',
                        nickname: `@${(nameFromDB || userName || userEmail.split('@')[0] || 'user')
                            .toLowerCase()
                            .replace(/\s+/g, '')}`,
                        avatar: avatar
                    }));

                    if (nameFromDB) {
                        localStorage.setItem('userName', nameFromDB);
                    }
                    if (avatar) {
                        localStorage.setItem('userAvatar', avatar);
                    }
                } else {
                    setUserData(prev => ({
                        ...prev,
                        name: userName || userEmail.split('@')[0] || 'Пользователь',
                        nickname: `@${(userName || userEmail.split('@')[0] || 'user')
                            .toLowerCase()
                            .replace(/\s+/g, '')}`,
                        avatar: userAvatar || '/img/ava.jpg'
                    }));
                }
            } catch (error) {
                setUserData(prev => ({
                    ...prev,
                    name: userName || userEmail.split('@')[0] || 'Пользователь',
                    nickname: `@${(userName || userEmail.split('@')[0] || 'user')
                        .toLowerCase()
                        .replace(/\s+/g, '')}`,
                    avatar: userAvatar || '/img/ava.jpg'
                }));
            }

            await loadUserCollection();
            loadUserReviews();

            setIsLoading(false);
        };

        checkAuthAndLoadData();
    }, [router]);

    const loadUserCollection = async () => {
        try {
            const userId = await getUserId();
            if (!userId) {
                showNotification('Ошибка: пользователь не найден', 'error');
                return;
            }

            const collection = await loadUserCollectionFromDB(userId);
            collection.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
            setUserCollection(collection);
        } catch (error) {
            setUserCollection([]);
        }
    };

    const loadUserReviews = () => {
        const savedReviews = localStorage.getItem('userReviews');
        if (savedReviews) {
            try {
                const reviews: Comment[] = JSON.parse(savedReviews);
                reviews.sort((a, b) => b.id - a.id);
                setUserReviews(reviews);
            } catch (error) {
                setUserReviews([]);
            }
        }
    };

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            localStorage.setItem('userName', userData.name);

            const nickname = `@${userData.name.toLowerCase().replace(/\s+/g, '')}`;
            setUserData(prev => ({ ...prev, nickname }));

            if (userEmail) {
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userEmail,
                        name: userData.name,
                        avatar: userData.avatar
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showNotification('Профиль успешно обновлен!');
                    if (data.name) {
                        setUserData(prev => ({
                            ...prev,
                            name: data.name
                        }));
                        localStorage.setItem('userName', data.name);
                    }
                } else {
                    showNotification(data.error || 'Профиль сохранен только локально', 'info');
                }
            }

            setIsEditing(false);

        } catch (error) {
            showNotification('Ошибка при сохранении профиля', 'error');
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
                        <div style={{ position: 'relative' }}>
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
                                            onClick={() => {
                                                setUserData(prev => ({ ...prev, theme: theme.name }));
                                                setShowThemeDropdown(false);
                                            }}
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
                            <BookCard
                                key={`${book.id}-${book.bookId}`}
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