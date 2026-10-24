import { t } from '@/shared/i18n';
import styles from './styles.module.css';

type Props = {
  /** Seconds the flock has flown */
  time: number;
  /** Number of crows */
  count: number;
  /** Frames drawn per second. Shows how heavy the work is */
  fps: number;
};

/**
 * Shows how long the flock has flown, how many crows there are, and how smoothly it runs.
 *
 * @param props.time  Seconds flown
 * @param props.count Number of crows
 * @param props.fps   Frames drawn per second
 */
export function Stats({ time, count, fps }: Props) {
  return (
    <dl className={styles.stats}>
      <dt>{t({ ja: '時間', en: 'Time' })}</dt>
      <dd>{time.toFixed(1)}s</dd>
      <dt>{t({ ja: '羽数', en: 'Crows' })}</dt>
      <dd>{count.toLocaleString()}</dd>
      <dt>FPS</dt>
      <dd>{Math.round(fps)}</dd>
    </dl>
  );
}
