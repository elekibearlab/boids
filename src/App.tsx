import { useEffect, useState } from 'react';
import { t } from '@/shared/i18n';
import { useKeyboardShortcuts } from '@/shared/useKeyboardShortcuts';
import { LanguageSwitch } from '@/ui';
import { Boids2D } from '@/view2d/Boids2D';
import { Boids3D } from '@/view3d/Boids3D';
import styles from './App.module.css';

/** Screens in the menu. Saved in the URL # so a reload opens the same screen */
const MODES = [
  {
    id: '2d',
    name: '2D',
    description: { ja: '横から見たカラスの群れ', en: 'A flock of crows seen from the side' },
  },
  {
    id: '3d',
    name: '3D',
    description: { ja: '空を飛ぶブロックのカラス', en: 'Block crows flying in the sky' },
  },
] as const;

type Mode = (typeof MODES)[number]['id'];

/** Gets the screen from the URL #. Uses 2D if the value is unknown */
function modeFromHash(): Mode {
  return location.hash === '#3d' ? '3d' : '2d';
}

export function App() {
  const [mode, setMode] = useState(modeFromHash);

  // Watch # changes, so the browser's back and forward buttons also switch screens
  useEffect(() => {
    const onHashChange = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const choose = (next: Mode) => {
    location.hash = next;
  };

  useKeyboardShortcuts({
    KeyM: () => choose(mode === '2d' ? '3d' : '2d'),
  });

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Boids</h1>
        <nav className={styles.menu} title={t({ ja: 'M で切り替え', en: 'Press M to switch' })}>
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? `${styles.tab} ${styles.current}` : styles.tab}
              onClick={() => choose(item.id)}
            >
              <span className={styles.tabName}>{item.name}</span>
              <span className={styles.tabDescription}>{t(item.description)}</span>
            </button>
          ))}
        </nav>
        <LanguageSwitch className={styles.langs} />
      </header>
      <main className={styles.main}>{mode === '2d' ? <Boids2D /> : <Boids3D />}</main>
    </div>
  );
}
