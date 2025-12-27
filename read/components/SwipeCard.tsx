// components/SwipeCard.tsx - минималистичная версия без ошибок
'use client'; // Указывает, что это клиентский компонент Next.js

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './SwipeCard.module.css';

// Интерфейс для данных книги
interface Book {
  id: number;
  title: string;
  author: string;
  genres: string;
  annotation: string;
  series_title?: string; // Название серии (опционально)
  series_number?: string; // Номер в серии (опционально)
  cover_url: string;
}

// Пропсы компонента SwipeCard
interface SwipeCardProps {
  book: Book; // Данные книги
  onSwipe: (direction: 'left' | 'right') => void; // Колбэк при свайпе
  isActive: boolean; // Активна ли карточка для взаимодействия
}

// Основной компонент карточки для свайпа (Tinder-подобный интерфейс)
export default function SwipeCard({ book, onSwipe, isActive }: SwipeCardProps) {
  // Состояние позиции карточки (x, y координаты)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // Состояние перетаскивания (активно ли перетаскивание)
  const [isDragging, setIsDragging] = useState(false);
  // Начальная позиция касания/щелчка
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  // Угол поворота карточки при свайпе
  const [rotation, setRotation] = useState(0);
  // Развернуто ли описание книги
  const [isExpanded, setIsExpanded] = useState(false);
  // Ref для доступа к DOM-элементу карточки
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Константы для настройки поведения свайпа
  const SWIPE_THRESHOLD = 80; // Минимальное расстояние для срабатывания свайпа
  const VERTICAL_LIMIT = 30; // Максимальное вертикальное смещение
  const HORIZONTAL_LIMIT = 100; // Максимальное горизонтальное смещение
  const ROTATION_FACTOR = 0.1; // Коэффициент поворота относительно смещения

  // Обработчик начала перетаскивания (общая логика)
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!isActive) return; // Не обрабатываем, если карточка неактивна
    
    setIsDragging(true);
    // Сохраняем начальную позицию относительно текущего положения карточки
    setStartPos({ 
      x: clientX - position.x, 
      y: clientY - position.y 
    });
  }, [isActive, position.x, position.y]);

  // Обработчик начала касания (для мобильных устройств)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  // Обработчик начала перетаскивания мышью
  const handleMouseStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // Предотвращаем выделение текста при перетаскивании
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  // Обработчик движения при перетаскивании (общая логика)
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !isActive) return; // Не обрабатываем, если не перетаскиваем или неактивно

    // Рассчитываем новую позицию по X
    const newX = clientX - startPos.x;
    
    // Ограничиваем горизонтальное движение в пределах HORIZONTAL_LIMIT
    const limitedX = Math.max(-HORIZONTAL_LIMIT, Math.min(newX, HORIZONTAL_LIMIT));
    
    // Рассчитываем и ограничиваем вертикальное движение
    const deltaY = clientY - startPos.y;
    const limitedY = Math.max(-VERTICAL_LIMIT, Math.min(deltaY, VERTICAL_LIMIT));
    
    // Рассчитываем поворот на основе горизонтального смещения
    const rotate = limitedX * ROTATION_FACTOR;
    
    // Обновляем состояние позиции и поворота
    setPosition({ x: limitedX, y: limitedY });
    setRotation(rotate);
  }, [isDragging, isActive, startPos.x, startPos.y, HORIZONTAL_LIMIT, VERTICAL_LIMIT, ROTATION_FACTOR]);

  // Обработчик движения при касании (для мобильных устройств)
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !isActive) return;
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [isDragging, isActive, handleMove]);

  // Обработчик движения мышью
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isActive) return;
    handleMove(e.clientX, e.clientY);
  }, [isDragging, isActive, handleMove]);

  // Обработчик окончания перетаскивания (общая логика)
  const handleEnd = useCallback(() => {
    if (!isDragging || !isActive) return;
    
    setIsDragging(false);
    
    // Проверяем, превысило ли смещение порог для срабатывания свайпа
    const shouldSwipe = Math.abs(position.x) > SWIPE_THRESHOLD;
    
    if (shouldSwipe) {
      // Определяем направление свайпа (вправо = лайк, влево = дизлайк)
      const direction = position.x > 0 ? 'right' : 'left';
      
      // Анимируем уход карточки за пределы экрана
      const exitX = position.x > 0 ? 500 : -500; // Уходим вправо или влево
      const exitY = position.y * 2; // Увеличиваем вертикальное смещение
      
      setPosition({ x: exitX, y: exitY });
      setRotation(rotation * 1.5); // Увеличиваем поворот для эффекта
      
      // Вызываем колбэк свайпа с небольшой задержкой для завершения анимации
      setTimeout(() => {
        onSwipe(direction);
      }, 150);
    } else {
      // Возвращаем карточку в исходное положение
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isDragging, isActive, position.x, position.y, rotation, SWIPE_THRESHOLD, onSwipe]);

  // Обработчик окончания касания
  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Обработчик окончания перетаскивания мышью
  const handleMouseEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Переключение развернутого/свернутого состояния описания
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал свайп
    setIsExpanded(!isExpanded);
  };

  // Навешиваем глобальные обработчики событий мыши и касания
  useEffect(() => {
    if (isDragging) {
      // Обработчики для мыши
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseEnd);
      
      // Обработчики для тач-устройств
      // Важно: используем { passive: true } для touchmove для лучшей производительности
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
      
      // Функция очистки: удаляем обработчики при размонтировании
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseEnd, handleTouchMove, handleTouchEnd]);

  // Обработчик для предотвращения скролла страницы при перетаскивании карточки
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !isActive) return;

    const preventTouchScroll = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // Предотвращаем скролл страницы при перетаскивании
      }
    };

    // Вешаем обработчик с capture: true для перехвата события
    card.addEventListener('touchmove', preventTouchScroll, { 
      passive: false, // Указываем, что обработчик может вызывать preventDefault()
      capture: true   // Перехватываем событие на фазе захвата
    });

    return () => {
      card.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [isDragging, isActive]);

  // Сброс состояния при деактивации карточки
  useEffect(() => {
    if (!isActive) {
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsExpanded(false);
    }
  }, [isActive]);

  // Стили для карточки с динамическими значениями
  const cardStyle = {
    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
    cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)', // Плавная анимация
    opacity: isActive ? 1 : 0.7, // Неактивные карточки полупрозрачны
  };

  return (
    <div
      ref={cardRef}
      className={`${styles.swipeCard} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
      style={cardStyle}
      // Обработчики событий для начала взаимодействия
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseStart}
      // Дополнительный обработчик окончания касания для надежности
      onTouchEnd={handleTouchEnd}
    >
      {/* Верхняя часть карточки с основной информацией о книге */}
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{book.title}</h2>
          <span className={styles.rating}>⭐ 0.00</span> {/* Заглушка для рейтинга */}
        </div>
        
        {/* Отображение информации о серии, если есть */}
        {book.series_title && (
          <p className={styles.series}>
            {book.series_title} {book.series_number && `#${book.series_number}`}
          </p>
        )}
        
        <p className={styles.author}>{book.author}</p>
        
        {/* Теги жанров (первые 3 жанра) */}
        <div className={styles.tags}>
          {book.genres.split(',').slice(0, 3).map((genre, i) => (
            <span key={i} className={styles.tag}>{genre.trim()}</span>
          ))}
        </div>
      </div>

      {/* Контейнер для обложки книги */}
      <div className={styles.coverContainer}>
        <Image
          src={book.cover_url}
          alt={book.title}
          width={180}
          height={270}
          className={styles.cover}
          priority={isActive} // Приоритетная загрузка для активной карточки
        />
      </div>

      {/* Описание книги с кнопкой "Читать дальше/Свернуть" */}
      <div className={styles.description}>
        <p className={isExpanded ? styles.expandedText : ''}>
          {isExpanded ? book.annotation : `${book.annotation.substring(0, 150)}...`}
        </p>
        <button 
          onClick={toggleExpand}
          className={styles.readMore}
          type="button"
        >
          {isExpanded ? 'Свернуть' : 'Читать дальше'}
        </button>
      </div>
    </div>
  );
}