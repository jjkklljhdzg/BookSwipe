// Login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Logging in with email:', email);
      
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('Login response:', data);

      if (data.success) {
        // Сохраняем все данные пользователя
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', data.name || email.split('@')[0]);
        
        // Сохраняем userId если он есть
        if (data.userId) {
          localStorage.setItem('userId', data.userId.toString());
          console.log('Saved userId:', data.userId);
        } else {
          // Если userId нет в ответе, получаем его отдельно
          console.log('Getting userId from /api/user/id...');
          const idRes = await fetch('/api/user/id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          });
          
          const idData = await idRes.json();
          if (idData.success && idData.userId) {
            localStorage.setItem('userId', idData.userId.toString());
            console.log('Got userId from API:', idData.userId);
          }
        }

        console.log('Login successful, redirecting to /Main');
        router.push('/Main');
      } else {
        alert(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Login error:', error);
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
      <h1 className={styles.title}>Вход</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
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

        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? 'ВХОД...' : 'ВОЙТИ'}
        </button>
      </form>

      <div className={styles.linkContainer}>
        <Link href="/Register" className={styles.link}>
          Нет аккаунта? Зарегистрироваться
        </Link>
      </div>
    </div>
  );
}