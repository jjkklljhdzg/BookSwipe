'use client'; // Указывает, что это клиентский компонент Next.js

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';

// Данные книг для раздела "Моя коллекция"
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

// Навигационные элементы (только одна кнопка "Назад" в данном случае)
const navItems = [
    { icon: '/img/back.png', label: 'Свайп', href: '/', active: true },
];

// Основной компонент страницы профиля пользователя
export default function ProfilePage() {
    // Состояние режима редактирования профиля
    const [isEditing, setIsEditing] = useState(false);
    // Состояние данных пользователя
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия',
        nickname: '@никнейм',
        avatar: '/img/ava.jpg',
        dateOfBirth: '00 00 0000'
    });
    // Ref для скрытого input элемента загрузки аватара
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Загрузка сохраненных данных из localStorage при монтировании компонента
    useEffect(() => {
        const savedName = localStorage.getItem('userName');
        const savedNickname = localStorage.getItem('userNickname');
        const savedAvatar = localStorage.getItem('userAvatar');
        const savedDateOfBirth = localStorage.getItem('userDateOfBirth');

        // Обновляем состояние данными из localStorage, если они есть
        setUserData(prev => ({
            ...prev,
            name: savedName || prev.name,
            nickname: savedNickname || prev.nickname,
            avatar: savedAvatar || prev.avatar,
            dateOfBirth: savedDateOfBirth || prev.dateOfBirth
        }));
    }, []);

    // Обработчик клика по аватару (открывает диалог выбора файла)
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    // Обработчик изменения аватара (загрузка нового изображения)
    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newAvatar = e.target?.result as string;
                // Обновляем аватар в состоянии и сохраняем в localStorage
                setUserData(prev => ({ ...prev, avatar: newAvatar }));
                localStorage.setItem('userAvatar', newAvatar);
            };
            reader.readAsDataURL(file);
        }
    };

    // Обработчик изменения полей ввода в форме редактирования
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserData(prev => ({ ...prev, [id]: value }));
    };

    // Обработчик сохранения изменений профиля
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        // Сохраняем данные в localStorage
        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userNickname', userData.nickname);
        localStorage.setItem('userDateOfBirth', userData.dateOfBirth);

        alert('Профиль успешно обновлен!');
        setIsEditing(false); // Выходим из режима редактирования
    };

    // Режим редактирования профиля
    if (isEditing) {
        return (
            <div className={styles.container}>
                {/* Верхняя панель с кнопкой "Назад" и заголовком */}
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

                {/* Блок с аватаром пользователя в режиме редактирования */}
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
                        {/* Скрытый input для загрузки файлов */}
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

                {/* Форма редактирования профиля */}
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

                    <button type="submit" className={styles.saveButton}>
                        СОХРАНИТЬ
                    </button>
                </form>
            </div>
        );
    }

    // Основной режим просмотра профиля
    return (
        <div className={styles.container}>

            {/* Верхняя панель навигации */}
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
                {/* Кнопка настроек для перехода в режим редактирования */}
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

            {/* Блок с аватаром пользователя */}
            <div className={styles.avatarBlock}>
                <div
                    className={styles.avatar}
                    style={{ backgroundImage: `url(${userData.avatar})` }}
                />
                <div className={styles.name}>{userData.name}</div>
                <div className={styles.nickname}>{userData.nickname}</div>
            </div>

            {/* Заголовок раздела "Моя коллекция" */}
            <div className={styles.sectionTitle}>МОЯ КОЛЛЕКЦИЯ</div>

            {/* Табы для фильтрации коллекции */}
            <div className={styles.tabs}>
                <button className={styles.tab}>Читаю</button>
                <button className={styles.tab}>Хочу прочитать</button>
                <button className={styles.tab}>В планах</button>
                <button className={styles.tab}>Брошено</button>
                <button className={styles.tab}>В избранном</button>
            </div>

            {/* Горизонтальная лента книг */}
            <div className={styles.special}>
                <div className={styles.popularDestinations}>
                    {bookData.recommended.map((book) => (
                        <BookCard
                            key={book.id}
                            id={book.id}          // уникальный идентификатор книги
                            title={book.title}
                            author={book.author}
                            rating={book.rating}
                            imageUrl={book.imageUrl}
                            href={book.href}
                        />
                    ))}
                </div>
            </div>

            {/* Заголовок раздела "Мои отзывы" */}
            <div className={styles.sectionTitle}>МОИ ОТЗЫВЫ</div>

            {/* Список отзывов пользователя */}
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