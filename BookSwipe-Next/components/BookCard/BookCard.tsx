'use client';

import Image from 'next/image';
import styles from './BookCard.module.css';
import Link from 'next/link';

interface BookCardProps {
  id: number;
  title: string;
  author: string;
  rating: string;
  imageUrl: string;
  href: string;
}

export default function BookCard({
  id,
  title,
  author,
  rating,
  imageUrl,
  href
}: BookCardProps) {
  return (
    <Link href={href} className={styles.bookCardLink}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          <Image
            src={imageUrl}
            alt={title}
            width={120}
            height={180}
            className={styles.bookImage}
            priority
          />
        </div>
        <div className={styles.info}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.author}>{author}</p>
          <div className={styles.rating}>
            <span className={styles.star}>★</span>
            <span>{rating}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}