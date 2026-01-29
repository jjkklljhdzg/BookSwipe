'use client';

import Image from "next/image";
import styles from "./profile.module.css";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard/BookCard';
import Notification from '@/components/Notification/Notification';
import { useRouter } from 'next/navigation';

// Тип для коллекции пользователя
// Тип для элемента коллекции пользователя
interface UserCollectionItem {
    id: number; // Уникальный ID записи в коллекции
    bookId: number; // ID книги в системе
    title: string; // Название книги
    author: string; // Автор книги
    coverUrl: string; // URL обложки книги
    status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite' | 'none'; // Статус книги (добавлен 'none')
    addedAt: string; // Дата добавления в коллекцию
    genres?: string; // Жанры книги (необязательно)
    rating?: string; // Рейтинг книги (необязательно)
}

// Тип для ответа сервера с профилем пользователя
interface ProfileResponse {
    success: boolean; // Успешность операции
    user?: { // Данные пользователя (необязательно)
        id: number; // ID пользователя
        email: string; // Email пользователя
        name: string; // Имя пользователя
        avatar: string; // Аватар пользователя
    };
    name?: string; // Имя пользователя (необязательно, альтернативный формат)
    avatar?: string; // Аватар пользователя (необязательно, альтернативный формат)
}

// Тип для комментария/отзыва пользователя
interface Comment {
    id: number; // ID комментария
    bookId: number; // ID книги
    userId: string; // ID пользователя
    userName: string; // Имя пользователя
    userAvatar: string; // Аватар пользователя
    rating: number; // Оценка (1-5)
    text: string; // Текст отзыва
    date: string; // Дата отзыва
    bookTitle: string; // Название книги
    bookAuthor: string; // Автор книги
    bookImage: string; // Изображение книги
}

// Навигационные элементы (только кнопка "Назад" на главную)
const navItems = [
    { icon: '/img/back.png', label: 'Свайп', href: '/Main', active: true },
];

// Доступные темы оформления приложения
const availableThemes = [
    { id: 'pink-dawn', name: '«Розовый рассвет»' }, // Тема 1
    { id: 'night-sky', name: '«Ночной небосвод»' }, // Тема 2
    { id: 'dark-forest', name: '«Тёмный лес со светлячками»' } // Тема 3
];

export default function ProfilePage() {
    const router = useRouter(); // Хук для навигации между страницами

    // Основные состояния пользователя
    const [userEmail, setUserEmail] = useState(''); // Email пользователя
    const [userId, setUserId] = useState<number | null>(null); // ID пользователя (число или null)
    const [isEditing, setIsEditing] = useState(false); // Режим редактирования профиля

    // Данные пользователя
    const [userData, setUserData] = useState({
        name: 'Имя Фамилия', // Имя пользователя
        nickname: '@никнейм', // Никнейм (генерируется из имени)
        avatar: '/img/ava.jpg', // URL аватара
        dateOfBirth: '00/00/0000', // Дата рождения
        theme: '«Розовый рассвет»' // Тема оформления
    });

    // UI состояния
    const [showThemeDropdown, setShowThemeDropdown] = useState(false); // Показать/скрыть выпадающий список тем
    const [activeTab, setActiveTab] = useState<'reading' | 'planned' | 'abandoned' | 'read' | 'favorite'>('reading'); // Активная вкладка коллекции

    // Уведомления
    const [notification, setNotification] = useState<{
        message: string; // Текст уведомления
        type: 'success' | 'error' | 'info'; // Тип уведомления
    } | null>(null); // Уведомление может быть null

    // Данные пользователя
    const [userCollection, setUserCollection] = useState<UserCollectionItem[]>([]); // Коллекция книг пользователя
    const [userReviews, setUserReviews] = useState<Comment[]>([]); // Отзывы пользователя (можно удалить)
    const [isLoading, setIsLoading] = useState(true); // Состояние загрузки данных

    const fileInputRef = useRef<HTMLInputElement>(null); // Ссылка на скрытый input для загрузки файлов
    const themeDropdownRef = useRef<HTMLDivElement>(null); // Ссылка на контейнер выпадающего списка тем

    // Показать уведомление
    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type }); // Устанавливаем уведомление в состояние
    };

    // Скрыть уведомление
    const hideNotification = () => {
        setNotification(null); // Сбрасываем уведомление в null
    };

    // Загрузка коллекции книг из БД
    const loadUserCollection = async () => {
        if (!userId) { // Проверяем, есть ли ID пользователя
            console.log('No userId, cannot load collection'); // Отладка
            return; // Прерываем выполнение если нет ID
        }

        try {
            console.log('Loading collection for user ID:', userId); // Отладка

            // Запрос к API для получения коллекции
            const response = await fetch(`/api/collection/get?userId=${userId}`);

            if (!response.ok) { // Если ответ не успешный
                const errorText = await response.text(); // Получаем текст ошибки
                console.error('Failed to load collection:', errorText); // Логируем ошибку
                throw new Error(`Failed to load collection: ${response.status}`); // Бросаем ошибку
            }

            const data = await response.json(); // Парсим JSON ответ
            console.log('Collection API response:', data); // Отладка

            if (data.success && data.collection) { // Если успешно и есть данные
                // Преобразуем данные API в формат интерфейса
                const collection: UserCollectionItem[] = data.collection.map((item: any) => ({
                    id: item.id, // ID записи
                    bookId: item.book_id, // ID книги
                    title: item.title || 'Без названия', // Название или значение по умолчанию
                    author: item.author || 'Неизвестный автор', // Автор или значение по умолчанию
                    coverUrl: item.cover_url || '/img/default-book.jpg', // Обложка или дефолтная
                    status: item.collection_type || 'none', // Статус или 'none'
                    addedAt: item.created_at || new Date().toISOString(), // Дата или текущая
                    genres: item.genres || '', // Жанры или пустая строка
                    rating: item.rating || '0.0' // Рейтинг или '0.0'
                }));

                console.log('Processed collection:', collection.length, 'items'); // Отладка

                setUserCollection(collection); // Устанавливаем коллекцию в состояние

                // Сохраняем в localStorage для офлайн-доступа
                localStorage.setItem('userCollection', JSON.stringify(collection));
            } else { // Если нет данных от API
                console.warn('No collection data received'); // Предупреждение
                // Fallback (резервный вариант) к localStorage
                const savedCollection = localStorage.getItem('userCollection');
                if (savedCollection) {
                    try {
                        const collection: UserCollectionItem[] = JSON.parse(savedCollection);
                        // Сортируем по дате добавления (новые сверху)
                        collection.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
                        setUserCollection(collection);
                    } catch (error) {
                        console.error('Error parsing localStorage collection:', error);
                        setUserCollection([]); // Устанавливаем пустую коллекцию при ошибке
                    }
                }
            }
        } catch (error) { // Обработка ошибок
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
        const savedReviews = localStorage.getItem('userReviews'); // Получаем отзывы из localStorage
        if (savedReviews) {
            try {
                const reviews: Comment[] = JSON.parse(savedReviews); // Парсим JSON
                reviews.sort((a, b) => b.id - a.id); // Сортируем по ID (новые сверху)
                setUserReviews(reviews); // Устанавливаем в состояние
            } catch (error) {
                console.error('Error loading reviews:', error); // Логируем ошибку
                setUserReviews([]); // Устанавливаем пустой массив
            }
        }
    };

    // Получение ID пользователя по email
    const getUserIdByEmail = async (email: string): Promise<number | null> => {
        try {
            // Запрос к API профиля пользователя
            const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
            if (!response.ok) return null; // Если ошибка, возвращаем null

            const data: ProfileResponse = await response.json(); // Парсим ответ

            if (data.success && data.user && data.user.id) { // Если есть данные пользователя
                return data.user.id; // Возвращаем ID
            }

            return null; // Иначе null
        } catch (error) {
            console.error('Error getting user ID:', error); // Логируем ошибку
            return null; // Возвращаем null
        }
    };

    // Основной эффект загрузки данных
    useEffect(() => {
        const checkAuthAndLoadData = async () => {
            // Проверка, что код выполняется на клиенте
            if (typeof window === 'undefined') return;

            // Получение данных из localStorage
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            const userEmail = localStorage.getItem('userEmail');
            const userName = localStorage.getItem('userName');
            const userAvatar = localStorage.getItem('userAvatar');

            // Проверка аутентификации
            if (!isLoggedIn || !userEmail) {
                router.push('/Login'); // Перенаправление на страницу входа
                return;
            }

            setUserEmail(userEmail); // Устанавливаем email в состояние

            try {
                // Запрос профиля пользователя с сервера
                const response = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`, {
                    method: 'GET', // Метод GET
                    headers: { 'Content-Type': 'application/json' } // Заголовки
                });

                if (response.ok) { // Если ответ успешный
                    const data: ProfileResponse = await response.json(); // Парсим данные

                    // Вариант 1: Полные данные пользователя в поле user
                    if (data.success && data.user) {
                        const userId = data.user.id;
                        const avatar = data.user.avatar || userAvatar || '/img/ava.jpg';
                        const name = data.user.name || userName || userEmail.split('@')[0] || 'Пользователь';

                        setUserId(userId); // Устанавливаем ID пользователя
                        setUserData(prev => ({
                            ...prev,
                            name: name, // Имя
                            nickname: `@${name.toLowerCase().replace(/\s+/g, '')}`, // Генерация никнейма
                            avatar: avatar // Аватар
                        }));

                        // Сохранение в localStorage
                        localStorage.setItem('userName', name);
                        localStorage.setItem('userAvatar', avatar);

                        // Загружаем коллекцию после получения ID
                        await loadUserCollection();
                    }
                    // Вариант 2: Имя и аватар в отдельных полях
                    else if (data.success && data.name) {
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

                        if (userId) await loadUserCollection(); // Загружаем коллекцию если есть ID
                        else fallbackToLocalStorage(userEmail, userName, userAvatar); // Fallback
                    } else {
                        fallbackToLocalStorage(userEmail, userName, userAvatar); // Fallback
                    }
                } else {
                    fallbackToLocalStorage(userEmail, userName, userAvatar); // Fallback при ошибке ответа
                }
            } catch (error) {
                console.error('Error loading profile:', error); // Логирование ошибки
                fallbackToLocalStorage(userEmail, userName, userAvatar); // Fallback при исключении
            }

            // Загружаем отзывы (можно удалить если не используются)
            loadUserReviews();

            setIsLoading(false); // Завершение загрузки
        };

        // Функция fallback (резервного варианта) при ошибках
        const fallbackToLocalStorage = async (email: string, userName: string | null, userAvatar: string | null) => {
            // Пытаемся получить ID пользователя
            const userId = await getUserIdByEmail(email);
            if (userId) setUserId(userId);

            // Устанавливаем данные из localStorage или значения по умолчанию
            setUserData(prev => ({
                ...prev,
                name: userName || email.split('@')[0] || 'Пользователь',
                nickname: `@${(userName || email.split('@')[0] || 'user')
                    .toLowerCase()
                    .replace(/\s+/g, '')}`, // Генерация никнейма
                avatar: userAvatar || '/img/ava.jpg'
            }));

            // Загружаем коллекцию если есть ID
            if (userId) await loadUserCollection();
        };

        checkAuthAndLoadData(); // Вызов основной функции
    }, [router]); // Зависимость от router (выполняется один раз при монтировании)

    // Обновляем коллекцию при изменении userId или activeTab
    useEffect(() => {
        if (userId) {
            loadUserCollection(); // Загружаем коллекцию когда появляется userId
        }
    }, [userId]); // Выполняется при изменении userId

    // Закрытие выпадающего списка при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Если клик был вне контейнера выпадающего списка
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
                setShowThemeDropdown(false); // Закрываем выпадающий список
            }
        };

        document.addEventListener('mousedown', handleClickOutside); // Подписываемся на клики
        return () => document.removeEventListener('mousedown', handleClickOutside); // Отписываемся при размонтировании
    }, []); // Пустой массив зависимостей - выполняется один раз

    const handleLogout = async () => {
        try {
            // Удаление всех данных пользователя из localStorage
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userAvatar');
            localStorage.removeItem('userCollection');
            localStorage.removeItem('userReviews');

            showNotification('Вы успешно вышли из аккаунта'); // Уведомление

            setTimeout(() => {
                router.push('/Login'); // Перенаправление на страницу входа через 1 секунду
            }, 1000);

        } catch (error) {
            showNotification('Ошибка при выходе', 'error'); // Уведомление об ошибке
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click(); // Программный клик по скрытому input файла
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; // Получаем первый выбранный файл
        if (file && userEmail) { // Если есть файл и email пользователя
            const reader = new FileReader(); // Создаем FileReader для чтения файла
            reader.onload = async (e) => { // Обработчик завершения чтения
                const newAvatar = e.target?.result as string; // Получаем Data URL аватара

                // Обновляем состояние
                setUserData(prev => ({ ...prev, avatar: newAvatar }));
                localStorage.setItem('userAvatar', newAvatar); // Сохраняем в localStorage

                try {
                    // Отправляем на сервер
                    const response = await fetch('/api/user/avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: userEmail,
                            avatar: newAvatar
                        })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) { // Если успешно
                        showNotification('Аватар обновлен');
                        if (data.avatar) { // Если сервер вернул обновленный аватар
                            setUserData(prev => ({ ...prev, avatar: data.avatar }));
                            localStorage.setItem('userAvatar', data.avatar);
                        }
                    } else { // Если ошибка сервера
                        const errorMessage = data.message || data.error || 'Ошибка при обновлении аватара';
                        showNotification(errorMessage, 'error');
                    }
                } catch (error) { // Если ошибка сети
                    showNotification('Ошибка сети при сохранении аватара', 'error');
                }
            };
            reader.readAsDataURL(file); // Читаем файл как Data URL
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target; // Получаем id поля и его значение
        setUserData(prev => ({ ...prev, [id]: value })); // Обновляем соответствующее поле в состоянии
    };

    // Обработчик выбора темы
    const handleThemeSelect = (themeName: string) => {
        setUserData(prev => ({ ...prev, theme: themeName })); // Обновляем тему в состоянии
        setShowThemeDropdown(false); // Закрываем выпадающий список

        try {
            localStorage.setItem('userTheme', themeName); // Сохраняем в localStorage
            showNotification(`Тема "${themeName}" применена!`); // Уведомление
        } catch (error) {
            showNotification('Ошибка при сохранении темы', 'error'); // Уведомление об ошибке
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); // Предотвращаем стандартное поведение формы

        try {
            if (!userEmail) { // Проверяем наличие email
                showNotification('Email не найден', 'error');
                return;
            }

            showNotification('Сохранение профиля...', 'info'); // Информационное уведомление

            // Отправка данных на сервер
            const response = await fetch('/api/user/profile', {
                method: 'PUT', // Метод PUT для обновления
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    name: userData.name,
                    avatar: userData.avatar
                })
            });

            const textResponse = await response.text(); // Получаем текст ответа
            let data; // Переменная для парсинга

            try {
                data = JSON.parse(textResponse); // Пытаемся распарсить JSON
            } catch (parseError) {
                showNotification('Ошибка в формате ответа сервера', 'error');
                return;
            }

            if (response.ok) { // Если статус ответа успешный
                if (data.success) { // Если операция успешна
                    const nickname = `@${userData.name.toLowerCase().replace(/\s+/g, '')}`; // Генерация никнейма
                    setUserData(prev => ({ ...prev, nickname }));

                    // Сохранение в localStorage
                    localStorage.setItem('userName', userData.name);
                    localStorage.setItem('userAvatar', userData.avatar);

                    showNotification('Профиль успешно сохранен');

                    setTimeout(() => {
                        setIsEditing(false); // Выход из режима редактирования через 1 секунду
                    }, 1000);
                } else { // Если сервер вернул ошибку
                    const errorMessage = data.message || data.error || 'Ошибка сервера';
                    showNotification(errorMessage, 'error');
                }
            } else { // Если HTTP статус ошибки
                showNotification(`Ошибка сервера: ${response.status}`, 'error');
            }

        } catch (error: any) { // Обработка сетевых ошибок
            showNotification(`Ошибка сети: ${error.message || 'Не удалось подключиться к серверу'}`, 'error');
        }
    };

    // Фильтрация книг по статусу
    const getBooksByStatus = (status: 'reading' | 'planned' | 'abandoned' | 'read' | 'favorite') => {
        return userCollection.filter(book => book.status === status); // Фильтруем книги по статусу
    };

    // Получение отображаемого названия для статуса
    const getStatusDisplayName = (status: string) => {
        switch (status) { // Switch-case для преобразования кодов статусов
            case 'reading': return 'Читаю';
            case 'planned': return 'В планах';
            case 'abandoned': return 'Брошено';
            case 'read': return 'Прочитанные';
            case 'favorite': return 'В избранном';
            default: return status; // Возвращаем оригинальное значение если не нашли
        }
    };

    // Функция для удаления книги из коллекции
    const handleRemoveFromCollection = async (bookId: number) => {
        if (!userId) { // Проверка ID пользователя
            showNotification('Пользователь не найден', 'error');
            return;
        }

        try {
            // Отправка запроса на удаление
            const response = await fetch('/api/collection/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    bookId: bookId
                })
            });

            const data = await response.json();

            if (response.ok && data.success) { // Если успешно удалено
                // Обновляем локальное состояние - фильтруем массив
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
                    collectionType: newStatus // Новый статус
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Обновляем локальное состояние - меняем статус у конкретной книги
                setUserCollection(prev =>
                    prev.map(book =>
                        book.bookId === bookId
                            ? { ...book, status: newStatus } // Обновляем статус
                            : book // Оставляем без изменений
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