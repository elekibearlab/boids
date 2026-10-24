import { useEffect, useRef, type RefObject } from 'react';
import { Vector3 } from 'three';
import { type Area, type Boid, createGridSearch, step } from '@/core/boids3d';
import { viewRadius } from '@/core/params';
import type { Vec } from '@/core/vec3';
import { createBirdMesh, CROW_COLORS, HAWK_COLORS } from './birdMesh';
import { createStage, type Stage } from './createStage';
import { createRangeGuide } from './rangeGuide';
import type { BoidsSceneHandle, BoidsSceneOptions } from '../types';

/** Seconds per simulation step. Fixed, so the flock moves the same at any frame rate */
const STEP_SECONDS = 1 / 60;
/** Max time (seconds) for one frame. Keeps the flock from jumping when you come back to the tab */
const MAX_DELTA = 0.1;
/**
 * Most steps in one frame. When a frame is late, catching up with more steps makes the next frame even later,
 * and it keeps getting worse (a dense flock makes each step heavier too). Past this, the time left over is dropped,
 * so a heavy flock plays in slow motion instead of freezing
 */
const MAX_STEPS_PER_FRAME = 2;
/** How often (seconds) the numbers on the panel are updated */
const STATS_INTERVAL = 0.5;
/** The roost is at the center of the area */
const ROOST: Vec = { x: 0, y: 0, z: 0 };
/** The hawk is twice as big as a crow */
const HAWK_SIZE = 2;
/** How fast the camera catches up with the crow it follows (share of the gap per frame) */
const FOLLOW_EASE = 0.08;

/**
 * Where the hawk is at time t (seconds). It loops through the area on a fixed path (a Lissajous curve),
 * crossing the middle often, so it keeps running into the flock.
 *
 * @param t    Seconds since the start
 * @param area The area the flock stays in
 */
function hawkAt(t: number, area: Area): Vec {
  return {
    x: Math.cos(t * 0.4) * area.width * 0.4,
    y: Math.sin(t * 0.9) * area.height * 0.25,
    z: Math.sin(t * 0.8) * area.depth * 0.4,
  };
}

/**
 * Makes a Three.js scene on the canvas and flies the flock.
 *
 * The flock changes every frame, so it is in a ref, not in React state.
 * In state, React would re-render 60 times a second, and both React and the draw loop would manage the flock.
 *
 * @param canvasRef    Canvas to draw on
 * @param area         The area the flock stays in
 * @param initialFlock Flock at the start. It also sets the number of crows
 * @param options      Play state, speed, rules, camera and display. Each render passes the latest values
 */
export function useBoidsScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  area: Area,
  initialFlock: Boid[],
  options: BoidsSceneOptions,
): BoidsSceneHandle {
  const flockRef = useRef(initialFlock);
  const timeRef = useRef(0);
  const fpsRef = useRef(0);
  const stageRef = useRef<Stage | null>(null);
  // The draw loop is made only once, so it reads the latest props through a ref
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const notify = () =>
    optionsRef.current.onStats({
      time: timeRef.current,
      count: flockRef.current.length,
      fps: fpsRef.current,
    });

  const handleRef = useRef<BoidsSceneHandle>({
    step: () => {
      const { params, flee, roost } = optionsRef.current;
      const flock = flockRef.current;
      flockRef.current = step(
        flock,
        params,
        area,
        STEP_SECONDS,
        { threat: flee ? hawkAt(timeRef.current, area) : null, roost: roost ? ROOST : null },
        createGridSearch(flock, viewRadius(params)),
      );
      timeRef.current += STEP_SECONDS;
    },
    load: (flock) => {
      flockRef.current = flock;
      timeRef.current = 0;
      notify();
    },
    zoom: (scale) => stageRef.current?.zoom(scale),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const stage = createStage(canvas, area);
    stageRef.current = stage;
    const crows = createBirdMesh(flockRef.current.length, CROW_COLORS);
    stage.scene.add(...crows.meshes);
    const hawk = createBirdMesh(1, HAWK_COLORS, HAWK_SIZE);
    stage.scene.add(...hawk.meshes);
    const guide = createRangeGuide(flockRef.current.length);
    stage.scene.add(guide.group);
    notify();

    const observer = new ResizeObserver(([entry]) =>
      stage.resize(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(canvas);

    const target = new Vector3();
    let frame = 0;
    let last = performance.now();
    let pending = 0;
    let sinceStats = 0;
    let frames = 0;
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;
      const { running, timeScale, params, flee, autoRotate, display } = optionsRef.current;

      // Move in fixed steps. Leftover time waits for the next frame
      if (running) {
        pending += delta * timeScale;
        for (let i = 0; i < MAX_STEPS_PER_FRAME && pending >= STEP_SECONDS; i++) {
          pending -= STEP_SECONDS;
          handleRef.current.step();
        }
        pending = Math.min(pending, STEP_SECONDS);
      }
      frames++;
      sinceStats += delta;
      if (sinceStats >= STATS_INTERVAL) {
        fpsRef.current = frames / sinceStats;
        frames = 0;
        sinceStats = 0;
        notify();
      }

      // Wings move with the flock's time, so they stop when paused and slow down with the speed slider
      const flapSeconds = running ? delta * timeScale : 0;
      crows.update(flockRef.current, params, flapSeconds);
      for (const mesh of hawk.meshes) {
        mesh.visible = flee;
      }
      if (flee) {
        // The hawk faces the way it moves: from where it was a moment ago to where it is now
        const position = hawkAt(timeRef.current, area);
        const before = hawkAt(timeRef.current - STEP_SECONDS, area);
        const velocity = {
          x: (position.x - before.x) / STEP_SECONDS,
          y: (position.y - before.y) / STEP_SECONDS,
          z: (position.z - before.z) / STEP_SECONDS,
        };
        hawk.update([{ position, velocity }], params, flapSeconds);
      }

      guide.group.visible = display.range;
      if (display.range) {
        guide.update(flockRef.current, params);
      }

      // Follow the first crow, or go back to the center. Easing keeps the camera from shaking with every turn
      const followed = flockRef.current[0];
      if (display.follow && followed) {
        target.set(followed.position.x, followed.position.y, followed.position.z);
      } else {
        target.set(0, 0, 0);
      }
      stage.moveTarget(stage.controls.target.clone().lerp(target, FOLLOW_EASE));
      stage.controls.autoRotate = autoRotate;
      stage.setSky(display.sky);
      stage.setFog(display.fog);
      stage.render();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      crows.dispose();
      hawk.dispose();
      guide.dispose();
      stageRef.current = null;
      stage.dispose();
    };
  }, [canvasRef]);

  return handleRef.current;
}
