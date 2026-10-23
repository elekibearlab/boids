import { useImperativeHandle, useRef, type Ref } from 'react';
import type { Area, Boid } from '@/core/boids3d';
import { useBoidsScene } from '../scene/useBoidsScene';
import type { BoidsSceneHandle, BoidsSceneOptions } from '../types';
import styles from './styles.module.css';

type Props = BoidsSceneOptions & {
  ref: Ref<BoidsSceneHandle>;
  area: Area;
  initialFlock: Boid[];
};

/**
 * Canvas for the 3D flock. It fills its parent.
 * Drag to turn the camera, and use the wheel to zoom.
 *
 * @param props.ref          Gets commands: replace the flock, move one frame, zoom
 * @param props.area         The area the flock stays in
 * @param props.initialFlock Flock at the start
 * @param props.running      Whether the crows move on their own
 * @param props.timeScale    Speed of time
 * @param props.params       Distances, weights and speed limits
 * @param props.flee         Whether a hawk flies through the flock
 * @param props.roost        Whether the crows circle the roost
 * @param props.autoRotate   Whether the camera turns on its own
 * @param props.display      Helpers for explaining and looks
 * @param props.onStats      Gets the time and number of crows
 */
export function BoidsCanvas({ ref, area, initialFlock, ...options }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useBoidsScene(canvasRef, area, initialFlock, options);
  useImperativeHandle(ref, () => handle, [handle]);
  return <canvas ref={canvasRef} className={styles.canvas} />;
}
