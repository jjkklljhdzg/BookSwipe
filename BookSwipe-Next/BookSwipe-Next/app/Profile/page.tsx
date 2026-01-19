'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';

const bookData = {
    recommended: [
        {
            id: 1,
            title: 'Название',
            author: 'Автор',
            rating: '4.4',
            imageUrl: '/img/design4.jpg',
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
        theme: '«Розовый рассвет»' // Добавляем поле для темы
    });
    const [showThemeDropdown, setShowThemeDropdown] = useState(false); // Для отображения выпадающего списка
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
    }, []);

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

            {/* Мои отзывы */}
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
                                <div className={styles.reviewStars}>
                                    ⭐ 0/5</div>
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