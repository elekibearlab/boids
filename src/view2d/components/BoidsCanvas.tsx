import { useImperativeHandle, useRef, type Ref } from 'react';
import type { Area, Boid } from '@/core/boids2d';
import { useBoidsScene } from '../scene/useBoidsScene';
import type { BoidsSceneHandle, BoidsSceneOptions } from '../types';
import styles from './styles.module.css';

type Props = BoidsSceneOptions & {
  ref: Ref<BoidsSceneHandle>;
  area: Area;
  initialFlock: Boid[];
};

/**
 * Canvas for the 2D flock. It fills its parent.
 * With the flee preset, the cursor is the predator.
 *
 * @param props.ref          Gets commands: replace the flock, move one frame
 * @param props.area         The area the flock stays in
 * @param props.initialFlock Flock at the start
 * @param props.running      Whether the crows move on their own
 * @param props.timeScale    Speed of time
 * @param props.params       Distances, weights and speed limits
 * @param props.flee         Whether the cursor is a predator
 * @param props.roost        Whether the crows circle the roost
 * @param props.display      Helpers for explaining
 * @param props.onStats      Gets the time and number of crows
 */
export function BoidsCanvas({ ref, area, initialFlock, ...options }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useBoidsScene(canvasRef, area, initialFlock, options);
  useImperativeHandle(ref, () => handle, [handle]);
  return <canvas ref={canvasRef} className={styles.canvas} />;
}
