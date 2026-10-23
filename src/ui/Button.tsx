import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  children: ReactNode;
  onClick: () => void;
  /** Shows the button as pressed, for example while playing */
  active?: boolean;
  /** Shortcut key hint. Shown on hover */
  title?: string;
};

/**
 * A button for the panel.
 *
 * @param props.children Text on the button
 * @param props.onClick  Called when clicked
 * @param props.active   Whether to show it as pressed
 * @param props.title    Text shown on hover
 */
export function Button({ children, onClick, active = false, title }: Props) {
  return (
    <button
      type="button"
      className={active ? `${styles.button} ${styles.active}` : styles.button}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
