import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <Image
          src="/img/logo.svg"
          alt="Логотип"
          width={32}
          height={32}
          className={styles.logoImage}
          priority
        /></div>
      <h1 className={styles.title}>Добро пожаловать!</h1>

      <div className={styles.buttons}>
        <Link href="/Register">
          <button className={styles.registerButton}>
            ЗАРЕГИСТРИРОВАТЬСЯ
          </button>
        </Link>
        <Link href="/Login">
          <button className={styles.loginButton}>
            ВОЙТИ
          </button>
        </Link>
      </div>
    </div>
  );
}
