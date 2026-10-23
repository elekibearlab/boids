import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  label: string;
  value: string;
  /** `<option>` and `<optgroup>` elements as they are, so grouped lists work too */
  children: ReactNode;
  onChange: (value: string) => void;
};

/**
 * A dropdown with a label.
 *
 * @param props.label    Name on the left
 * @param props.value    Selected value
 * @param props.children Options
 * @param props.onChange Called when the selection changes
 */
export function Select({ label, value, children, onChange }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
