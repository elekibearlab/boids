import styles from './styles.module.css';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * A checkbox to turn something on or off.
 *
 * @param props.label    Name on the right
 * @param props.checked  Whether it is on
 * @param props.onChange Called when it is turned on or off
 */
export function Toggle({ label, checked, onChange }: Props) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
