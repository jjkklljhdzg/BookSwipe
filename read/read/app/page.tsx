import Image from 'next/image';
import styles from './page.module.css';
import SearchIcon from '/img/saerch.png';
import BookCard from '@/components/BookCard/BookCard';
import BottomNav from '@/components/BottomNav/page';

// Данные для книг
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
    {
      id: 4,
      title: 'Название',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/vogue1design.jpg',
      href: '/book/4'
    },
    {
      id: 5,
      title: 'Название',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/vogue2design.jpg',
      href: '/book/5'
    },
  ],
  newArrivals: [
    {
      id: 6,
      title: 'Новинка 1',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/design3.jpg',
      href: '/book/6'
    },
    {
      id: 7,
      title: 'Новинка 2',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/vogue2design.jpg',
      href: '/book/7'
    },
    {
      id: 8,
      title: 'Новинка 3',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/design1.jpg',
      href: '/book/8'
    },
  ],
  popular: [
    {
      id: 9,
      title: 'Популярное 1',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/vogue1design.jpg',
      href: '/book/9'
    },
    {
      id: 10,
      title: 'Популярное 2',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/design2.jpg',
      href: '/book/10'
    },
    {
      id: 11,
      title: 'Популярное 3',
      author: 'Автор',
      rating: '4.4',
      imageUrl: '/img/vogue3design.jpg',
      href: '/book/11'
    },
  ],
};

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image
            src="/img/logo.png"
            alt="Логотип"
            width={32}
            height={32}
            className={styles.logoImage}
            priority
          />
        </div>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Поиск книги"
            className={styles.searchInput}
          />
          <button className={styles.searchButton} aria-label="Search">
            <Image
              src="/img/saerch.png"
              alt="Поиск"
              width={20}
              height={20}
              className={styles.searchIcon}
            />
          </button>
        </div>
      </header>

      <main className={styles.popular}>
        <div className={styles.sectionTitle}>
          <h2>ПОДОБРАНО СПЕЦИАЛЬНО ДЛЯ ВАС</h2>
        </div>

        {/* Рекомендованные книги */}
        <div className={styles.special}>
          <h2>По вашим предпочтениям</h2>
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

        {/* Новинки */}
        <div className={styles.special}>
          <h2>Новинки</h2>
          <div className={styles.popularDestinations}>
            {bookData.newArrivals.map((book) => (
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

        {/* Популярные */}
        <div className={styles.special}>
          <h2>Популярные</h2>
          <div className={styles.popularDestinations}>
            {bookData.popular.map((book) => (
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
      </main>

      <BottomNav />
    </div>
  );
}