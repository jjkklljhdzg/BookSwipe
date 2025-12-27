// Импорт необходимых зависимостей
import Link from 'next/link'; // Компонент Next.js для клиентской навигации
import styles from './BottomNav.module.css'; // CSS-модуль для стилей компонента

// Основной компонент нижней навигационной панели
export default function BottomNav() {
  // Массив с данными для элементов навигации
  const navItems = [
    { 
      icon: '/img/свайп.png',
      label: 'Свайп',
      href: '/Swipe'
    },
    { 
      icon: '/img/главная.png',
      label: 'Главная',
      href: '/'
    },
    { 
      icon: '/img/профиль.png',
      label: 'Профиль',
      href: '/Profile'
    },
  ];

  // Рендеринг компонента
  return (
    // Навигационный контейнер с применением стилей из CSS-модуля
    <nav className={styles.bottomNav}>
      {/* Динамическое отображение элементов навигации */}
      {navItems.map((item) => (
        // Компонент Link для клиентской навигации без перезагрузки страницы
        <Link
          key={item.label} // Уникальный ключ для каждого элемента (React требование)
          href={item.href} // Путь для навигации
          className={styles.navLink} // Стили для ссылки навигации
        >
          {/* Иконка навигационного элемента */}
          <img 
            src={item.icon}
            alt={item.label}
            className={styles.navIcon}
          />
          {/* Текстовая метка элемента навигации */}
          <span className={styles.navLabel}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}