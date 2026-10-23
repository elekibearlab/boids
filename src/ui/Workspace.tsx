import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  /** Text on the top left of the canvas. It shows in the video what is running now */
  caption: ReactNode;
  /** Content of the control panel on the right */
  panel: ReactNode;
  /** The canvas */
  children: ReactNode;
};

/**
 * Screen layout: canvas on the left, control panel on the right. 2D and 3D use the same layout.
 * The panel is never on top of the canvas, so the camera only has to put the board in the center.
 *
 * @param props.caption  Text shown on the canvas
 * @param props.panel    Content of the control panel
 * @param props.children The canvas
 */
export function Workspace({ caption, panel, children }: Props) {
  return (
    <div className={styles.workspace}>
      <div className={styles.stage}>
        {children}
        <div className={styles.caption}>{caption}</div>
      </div>
      <aside className={styles.panel}>{panel}</aside>
    </div>
  );
}
