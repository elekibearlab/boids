import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  title: string;
  children: ReactNode;
};

/**
 * A group with a heading in the control panel.
 *
 * @param props.title    Heading
 * @param props.children Content
 */
export function Section({ title, children }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      {children}
    </section>
  );
}

/**
 * Puts buttons in a row. They wrap to the next line if there is not enough space.
 *
 * @param props.children Buttons
 */
export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className={styles.buttonRow}>{children}</div>;
}

/**
 * Puts buttons in a grid with 2 columns. Use it when button names have very different lengths.
 *
 * @param props.children Buttons
 */
export function ButtonGrid({ children }: { children: ReactNode }) {
  return <div className={styles.buttonGrid}>{children}</div>;
}
