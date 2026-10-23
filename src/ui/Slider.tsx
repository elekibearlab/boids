import styles from './styles.module.css';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** How to show the number on the right. Use it to add a unit */
  format?: (value: number) => string;
  onChange: (value: number) => void;
};

/**
 * A slider with a label and a number.
 *
 * @param props.label    Name on the left
 * @param props.value    Current value
 * @param props.min      Minimum
 * @param props.max      Maximum
 * @param props.step     Step size
 * @param props.format   How to show the number
 * @param props.onChange Called when the value changes
 */
export function Slider({ label, value, min, max, step = 1, format = String, onChange }: Props) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.range}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={styles.value}>{format(value)}</span>
    </label>
  );
}
