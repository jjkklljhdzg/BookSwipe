import Link from 'next/link';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const navItems = [
    { icon: '/img/свайп.png', label: 'Свайп', href: '/Swipe'},
    { icon: '/img/главная.png', label: 'Главная', href: '/Main'},
    { icon: '/img/профиль.png', label: 'Профиль', href: '/Profile'},
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={styles.navLink}
        >
          <img src={item.icon} alt={item.label} className={styles.navIcon} />
          <span className={styles.navLabel}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );

}
