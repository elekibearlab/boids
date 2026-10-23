import { Fragment, type MouseEvent } from 'react';
import { EMBEDDED, LANG, LANGS, languageUrl, t } from '@/shared/i18n';
import styles from './styles.module.css';

type Props = {
  /** Where to put it. The parent decides, so the switch can go anywhere in the header */
  className?: string;
};

/**
 * Language switch "JA | EN". It opens the page again with a new ?lang= (see shared/i18n.ts).
 * There are only 2 languages, so all of it is one link to the other language.
 * Inside an iframe it shows nothing, because the site around it has its own switch.
 *
 * @param props.className Class for placing it
 */
export function LanguageSwitch({ className }: Props) {
  if (EMBEDDED) {
    return null;
  }
  const other = LANG === 'ja' ? 'en' : 'ja';
  // The # changes while the page is open (for example 2D → 3D), so make the URL when clicked, not when drawn
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    location.assign(languageUrl(other));
  };
  return (
    <a
      href={languageUrl(other)}
      onClick={open}
      className={className ? `${styles.langs} ${className}` : styles.langs}
      // The label for screen readers is in the new language, so people who speak it can understand it
      aria-label={t({ ja: 'Switch to English', en: '日本語に切り替え' })}
    >
      {LANGS.map((item, i) => (
        <Fragment key={item.id}>
          {i > 0 && <span className={styles.langSeparator}>|</span>}
          <span className={item.id === LANG ? styles.currentLang : undefined}>{item.name}</span>
        </Fragment>
      ))}
    </a>
  );
}
