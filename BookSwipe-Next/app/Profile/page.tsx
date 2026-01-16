'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';
import Notification from '@/components/Notification/Notification'; // Оставляем ваш компонент

const bookData = {
    recommended: [
        {
            id: 1,
            title: 'Название',
            author: 'Автор',
            rating: '4.4',
            imageUrl: '/img/design3.jpg',
            href: '/book/1'
        },
        {
            id: 2,
            title: 'Название',
            author: 'Автор',
            rating: '4.4',
            imageUrl: '/img/design2.jpg',
            href: '/book/2'
        },
        {
            id: 3,
            title: 'Название',
            author: 'Автор',
            rating: '4.4',
            imageUrl: '/img/design1.jpg',
            href: '/book/3'
        },
    ]
};

const navItems = [
    { icon: '/img/back.png', label: 'Свайп', href: '/', active: true },
];

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия',
        nickname: '@никнейм',
        avatar: '/img/ava.jpg',
        dateOfBirth: '00 00 0000'
    });
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
    } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedName = localStorage.getItem('userName');
        const savedNickname = localStorage.getItem('userNickname');
        const savedAvatar = localStorage.getItem('userAvatar');
        const savedDateOfBirth = localStorage.getItem('userDateOfBirth');

        setUserData(prev => ({
            ...prev,
            name: savedName || prev.name,
            nickname: savedNickname || prev.nickname,
            avatar: savedAvatar || prev.avatar,
            dateOfBirth: savedDateOfBirth || prev.dateOfBirth
        }));
    }, []);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const hideNotification = () => {
        setNotification(null);
    };

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showNotification('Пожалуйста, выберите изображение', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showNotification('Размер изображения не должен превышать 5MB', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const newAvatar = e.target?.result as string;
                setUserData(prev => ({ ...prev, avatar: newAvatar }));
                localStorage.setItem('userAvatar', newAvatar);
                showNotification('Аватар успешно обновлен!');
            };
            reader.onerror = () => {
                showNotification('Ошибка при загрузке изображения', 'error');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserData(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!userData.name.trim() || !userData.nickname.trim() || !userData.dateOfBirth.trim()) {
            showNotification('Пожалуйста, заполните все поля', 'error');
            return;
        }

        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userNickname', userData.nickname);
        localStorage.setItem('userDateOfBirth', userData.dateOfBirth);

        showNotification('Профиль успешно обновлен!');
        setIsEditing(false);
    };

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
                            placeholder="ДД ММ ГГГГ"
                        />
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
                <div className={styles.name}>{userData.name}</div>
                <div className={styles.nickname}>{userData.nickname}</div>
            </div>

            <div className={styles.sectionTitle}>МОЯ КОЛЛЕКЦИЯ</div>

            <div className={styles.tabs}>
                <button className={styles.tab}>Читаю</button>
                <button className={styles.tab}>Хочу прочитать</button>
                <button className={styles.tab}>В планах</button>
                <button className={styles.tab}>Брошено</button>
                <button className={styles.tab}>В избранном</button>
            </div>

            <div className={styles.special}>
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

            <div className={styles.sectionTitle}>МОИ ОТЗЫВЫ</div>

            <div className={styles.reviewList}>
                {[1, 2].map((item) => (
                    <div key={item} className={styles.reviewCard}>
                        <div className={styles.reviewTop}>
                            <div
                                className={styles.smallAvatar}
                                style={{ backgroundImage: `url(${userData.avatar})` }}
                            />
                            <div className={styles.reviewInfo}>
                                <div>00/00/00</div>
                                <div className={styles.reviewStars}>⭐ 0/5</div>
                            </div>
                        </div>

                        <div className={styles.reviewText}>
                            Отличный сервис!
                            Всё очень понравилось, буду рекомендовать друзьям.
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}