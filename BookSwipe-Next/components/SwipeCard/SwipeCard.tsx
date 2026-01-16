'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [needsExpandButton, setNeedsExpandButton] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 80;
  const VERTICAL_LIMIT = 30;
  const HORIZONTAL_LIMIT = 100;
  const ROTATION_FACTOR = 0.1;

  // Простая проверка необходимости кнопки "Читать далее" (упрощаем)
  useEffect(() => {
    if (book.annotation && book.annotation.length > 110) {
      setNeedsExpandButton(true);
    } else {
      setNeedsExpandButton(false);
    }
  }, [book.annotation]);

  // Обработчик начала перетаскивания
  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!isActive) return;
    
    setIsDragging(true);
    setStartPos({ 
      x: clientX - position.x, 
      y: clientY - position.y 
    });
  }, [isActive, position.x, position.y]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handleStart]);

  const handleMouseStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  // Обработчик движения
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !isActive) return;

    const newX = clientX - startPos.x;
    const limitedX = Math.max(-HORIZONTAL_LIMIT, Math.min(newX, HORIZONTAL_LIMIT));
    const deltaY = clientY - startPos.y;
    const limitedY = Math.max(-VERTICAL_LIMIT, Math.min(deltaY, VERTICAL_LIMIT));
    const rotate = limitedX * ROTATION_FACTOR;
    
    setPosition({ x: limitedX, y: limitedY });
    setRotation(rotate);
  }, [isDragging, isActive, startPos.x, startPos.y]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !isActive) return;
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [isDragging, isActive, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !isActive) return;
    handleMove(e.clientX, e.clientY);
  }, [isDragging, isActive, handleMove]);

  // Обработчик окончания перетаскивания
  const handleEnd = useCallback(() => {
    if (!isDragging || !isActive) return;
    
    setIsDragging(false);
    
    const shouldSwipe = Math.abs(position.x) > SWIPE_THRESHOLD;
    
    if (shouldSwipe) {
      const direction = position.x > 0 ? 'right' : 'left';
      const exitX = position.x > 0 ? 500 : -500;
      const exitY = position.y * 2;
      
      setPosition({ x: exitX, y: exitY });
      setRotation(rotation * 1.5);
      
      setTimeout(() => {
        onSwipe(direction);
      }, 150);
    } else {
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isDragging, isActive, position.x, position.y, rotation, onSwipe]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Навешиваем глобальные обработчики
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseEnd, handleTouchMove, handleTouchEnd]);

  // Обработчик для предотвращения скролла
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !isActive) return;

    const preventTouchScroll = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    card.addEventListener('touchmove', preventTouchScroll, { 
      passive: false,
      capture: true 
    });

    return () => {
      card.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [isDragging, isActive]);

  // Сброс при деактивации
  useEffect(() => {
    if (!isActive) {
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsExpanded(false);
    }
  }, [isActive]);

  const cardStyle = {
    transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
    cursor: isActive ? (isDragging ? 'grabbing' : 'grab') : 'default',
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)',
    opacity: isActive ? 1 : 0.7,
  };

  return (
    <div
      ref={cardRef}
      className={`${styles.swipeCard} ${isActive ? styles.active : ''}`}
      style={cardStyle}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseStart}
      onTouchEnd={handleTouchEnd}
    >
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

      <div className={styles.coverContainer}>
        <Image
          src={book.cover_url}
          alt={book.title}
          width={200}
          height={300}
          className={styles.cover}
          priority={isActive}
        />
      </div>

      <div ref={descriptionRef} className={styles.description}>
        <p className={isExpanded ? styles.expandedText : ''}>
          {book.annotation}
        </p>
        
        {needsExpandButton && (
          <button 
            onClick={toggleExpand}
            className={styles.readMore}
            type="button"
          >
            {isExpanded ? 'Свернуть' : 'Читать далее'}
          </button>
        )}
      </div>
    </div>
  );
}