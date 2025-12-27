// Указываем, что это клиентский компонент Next.js
'use client';

// Импорт необходимых компонентов и стилей
import Image from 'next/image'; // Оптимизированный компонент для работы с изображениями в Next.js
import styles from './BookCard.module.css'; // CSS-модуль для стилизации компонента
import Link from 'next/link'; // Компонент для клиентской навигации без перезагрузки страницы

// Интерфейс для типизации пропсов (свойств) компонента BookCard
interface BookCardProps {
  id: number;
  title: string;
  author: string;
  rating: string;
  imageUrl: string;
  href: string;
}

// Основной компонент карточки книги
export default function BookCard({
  id,
  title,
  author,
  rating,
  imageUrl,
  href
}: BookCardProps) {  // Деструктуризация пропсов
  
  // Возвращаем JSX для рендеринга компонента
  return (
    // Оборачиваем карточку в компонент Link для клиентской навигации
    <Link 
      href={href}  // URL для перехода при клике
      className={styles.bookCardLink}  // CSS-класс для стилизации ссылки
    >
      {/* Основной контейнер карточки */}
      <div className={styles.card}>
        
        {/* Контейнер для изображения обложки книги */}
        <div className={styles.imageContainer}>
          <Image
            src={imageUrl}
            alt={title}
            width={120}
            height={180}
            className={styles.bookImage}
            priority           // Помечаем изображение как приоритетное для загрузки
            /*
              Примечание о 'priority':
              - Указывает Next.js, что это изображение должно загружаться в первую очередь
              - Полезно для изображений, которые видны пользователю сразу (Above the Fold)
              - Улучшает показатели Core Web Vitals (LCP - Largest Contentful Paint)
            */
          />
        </div>
        
        {/* Контейнер с текстовой информацией о книге */}
        <div className={styles.info}>
          {}
          <h3 className={styles.title}>{title}</h3>
          
          {}
          <p className={styles.author}>{author}</p>
          
          {}
          <div className={styles.rating}>
            {}
            <span className={styles.star}>★</span>
            {}
            <span>{rating}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}