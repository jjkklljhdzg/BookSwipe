// components/SwipeCard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './SwipeCard.module.css';

interface Book {
  id: number;
  title: string;
  author: string;
  genres: string;
  annotation: string;
  series_title?: string;
  series_number?: string;
  cover_url: string;
}

interface SwipeCardProps {
  book: Book;
  onSwipe: (direction: 'left' | 'right') => void;
  isActive: boolean;
}

export default function SwipeCard({ book, onSwipe, isActive }: SwipeCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isActive) return;
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setStartPos({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const newX = clientX - startPos.x;
    const newY = clientY - startPos.y;
    
    setPosition({ x: newX, y: newY });
    
    // Добавляем небольшой поворот при движении
    const rotate = newX * 0.1;
    setRotation(rotate);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const threshold = 100; // Порог свайпа
    
    if (position.x > threshold) {
      // Свайп вправо - лайк
      onSwipe('right');
    } else if (position.x < -threshold) {
      // Свайп влево - дизлайк
      onSwipe('left');
    } else {
      // Возвращаем карточку на место
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем срабатывание свайпа
    setIsExpanded(!isExpanded);
  };

  // Эффект для обработки мыши
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
      };
    }
  }, [isDragging, position, startPos]);

  // Сброс позиции при деактивации карточки
  useEffect(() => {
    if (!isActive) {
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsExpanded(false); // Сбрасываем расширенный текст
    }
  }, [isActive]);

  const cardStyle = {
    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
    cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
  };

  return (
    <div
      ref={cardRef}
      className={`${styles.swipeCard} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
      style={cardStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={handleTouchStart}
    >
      {/* Верхняя часть карточки с инфой о книге */}
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{book.title}</h2>
          <span className={styles.rating}>⭐ 0.00</span>
        </div>
        
        {book.series_title && (
          <p className={styles.series}>
            {book.series_title} {book.series_number && `#${book.series_number}`}
          </p>
        )}
        
        <p className={styles.author}>{book.author}</p>
        
        <div className={styles.tags}>
          {book.genres.split(',').slice(0, 3).map((genre, i) => (
            <span key={i} className={styles.tag}>{genre.trim()}</span>
          ))}
        </div>
      </div>

      {/* Обложка книги */}
      <div className={styles.coverContainer}>
        <Image
          src={book.cover_url}
          alt={book.title}
          width={180}
          height={270}
          className={styles.cover}
          priority={isActive}
        />
      </div>

      {/* Описание книги */}
      <div className={styles.description}>
        <p className={isExpanded ? styles.expandedText : ''}>
          {isExpanded ? book.annotation : `${book.annotation.substring(0, 150)}...`}
        </p>
        <button 
          onClick={toggleExpand}
          className={styles.readMore}
        >
          {isExpanded ? 'Свернуть' : 'Читать дальше'}
        </button>
      </div>
    </div>
  );
}