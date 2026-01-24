import Link from 'next/link';
import Image from 'next/image';
import styles from './register.module.css';

export default function RegisterPage() {
  return (
    <div className={styles.container}>
      <div className={styles.logo}><Image
        src="/img/logo.png"
        alt="Логотип"
        width={32}
        height={32}
        className={styles.logoImage}
        priority
      /></div>
      <h1 className={styles.title}>Создание аккаунта</h1>

      <form className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Почта</label>
          <input
            type="email"
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Пароль</label>
          <input
            type="password"
            className={styles.input}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Подтвердить пароль</label>
          <input
            type="password"
            className={styles.input}
          />
        </div>

        <button type="submit" className={styles.submitButton}>
          <Link href="/Main" className={styles.registerButton}>
            ЗАРЕГИСТРИРОВАТЬСЯ
          </Link>
        </button>
      </form>

      <div className={styles.linkContainer}>
        <Link href="/Login" className={styles.link}>
          Есть аккаунт? Войти
        </Link>
      </div>
    </div>
  );
}