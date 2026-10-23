import { t } from '@/shared/i18n';
import styles from './styles.module.css';

type Props = {
  /** Seconds the flock has flown */
  time: number;
  /** Number of crows */
  count: number;
};

/**
 * Shows how long the flock has flown and how many crows there are.
 *
 * @param props.time  Seconds flown
 * @param props.count Number of crows
 */
export function Stats({ time, count }: Props) {
  return (
    <dl className={styles.stats}>
      <dt>{t({ ja: '時間', en: 'Time' })}</dt>
      <dd>{time.toFixed(1)}s</dd>
      <dt>{t({ ja: '羽数', en: 'Crows' })}</dt>
      <dd>{count}</dd>
    </dl>
  );
}
