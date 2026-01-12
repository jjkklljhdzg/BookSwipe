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

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия',
        nickname: '@никнейм',
        avatar: '/img/ava.jpg',
        dateOfBirth: '00 00 0000'
    });
    const fileInputRef = useRef<HTMLInputElement>(null); // Создаёт ссылку на скрытую страницу

    // Загружаем сохраненные данные из localStorage при монтировании
    useEffect(() => {
        const savedName = localStorage.getItem('userName');
        const savedNickname = localStorage.getItem('userNickname');
        const savedAvatar = localStorage.getItem('userAvatar');
        const savedDateOfBirth = localStorage.getItem('userDateOfBirth');
        const savedLocation = localStorage.getItem('userLocation');

        setUserData(prev => ({
            ...prev, //копируем старые данные
            name: savedName || prev.name, // если есть в localStorage — берём, иначе — стандартные данные 
            nickname: savedNickname || prev.nickname,
            avatar: savedAvatar || prev.avatar,
            dateOfBirth: savedDateOfBirth || prev.dateOfBirth
        }));
    }, []);

    const handleAvatarClick = () => {
        fileInputRef.current?.click(); // Программно кликает на скрытый input
    };

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; // Берём первый выбранный файл
        if (file) {
            const reader = new FileReader(); // Создаём FileReader для чтения файла
            reader.onload = (e) => {
                const newAvatar = e.target?.result as string; // Получаем Data URL (base64)
                setUserData(prev => ({ ...prev, avatar: newAvatar })); // Обновляем расположение 
                localStorage.setItem('userAvatar', newAvatar); // Сохраняем в localStorage
            };
            reader.readAsDataURL(file); // Читаем файл 
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target; // id = "name", value = введённый текст
        setUserData(prev => ({ ...prev, [id]: value })); // Динамически обновляем поле
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();  // Предотвращаем перезагрузку страницы

        // Сохраняем данные в localStorage
        localStorage.setItem('userName', userData.name);
        localStorage.setItem('userNickname', userData.nickname);
        localStorage.setItem('userDateOfBirth', userData.dateOfBirth);

        alert('Профиль успешно обновлен!');
        setIsEditing(false); // Переключаемся в режим просмотра
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