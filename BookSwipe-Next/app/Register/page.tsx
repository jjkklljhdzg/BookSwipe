'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name || email.split('@')[0]);

        alert('Регистрация успешна!');
        router.push('/Main');
      } else {
        alert(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      alert('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

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
        />
      </div>
      <h1 className={styles.title}>Регистрация</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Имя (необязательно)</label>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Почта</label>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Пароль</label>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Подтвердить пароль</label>
          <input
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'РЕГИСТРАЦИЯ...' : 'СОЗДАТЬ АККАУНТ'}
        </button>
      </form>

      <div className={styles.linkContainer}>
        <Link href="/Login" className={styles.link}>
          Уже есть аккаунт? Войти
        </Link>
      </div>
    </div>
  );
}
