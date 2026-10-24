import { useEffect, useRef, type RefObject } from 'react';
import { Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import { type Area, type Boid, createGridSearch, step } from '@/core/boids2d';
import { viewRadius } from '@/core/params';
import type { Vec } from '@/core/vec2';
import { createCrowSprites } from './crowSprites';
import { createStage } from './createStage';
import { attachPointerThreat } from './pointerThreat';
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
const ROOST: Vec = { x: 0, y: 0 };

/**
 * Makes a Three.js scene on the canvas and flies the flock.
 *
 * The flock changes every frame, so it is in a ref, not in React state.
 * In state, React would re-render 60 times a second, and both React and the draw loop would manage the flock.
 *
 * @param canvasRef    Canvas to draw on
 * @param area         The area the flock stays in
 * @param initialFlock Flock at the start. It also sets the number of crows
 * @param options      Play state, speed, rules and display. Each render passes the latest values
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
  const threatRef = useRef<Vec | null>(null);
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
        { threat: flee ? threatRef.current : null, roost: roost ? ROOST : null },
        createGridSearch(flock, viewRadius(params)),
      );
      timeRef.current += STEP_SECONDS;
    },
    load: (flock) => {
      flockRef.current = flock;
      timeRef.current = 0;
      notify();
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const stage = createStage(canvas, area);
    const crows = createCrowSprites(flockRef.current.length);
    stage.scene.add(...crows.meshes);
    const guide = createRangeGuide(flockRef.current.length);
    stage.scene.add(guide.group);
    // A ring around the cursor: the distance at which crows notice it
    const threatRing = new Mesh(
      new RingGeometry(0.96, 1, 64),
      new MeshBasicMaterial({ color: 0xd7263d, transparent: true, opacity: 0.6 }),
    );
    stage.scene.add(threatRing);
    notify();

    const observer = new ResizeObserver(([entry]) =>
      stage.resize(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(canvas);
    const pointer = attachPointerThreat(canvas);

    let frame = 0;
    let last = performance.now();
    let pending = 0;
    let sinceStats = 0;
    let frames = 0;
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, MAX_DELTA);
      last = now;
      const { running, timeScale, params, flee, display } = optionsRef.current;

      const at = pointer.current();
      const world = at ? stage.toWorld(at.px, at.py) : null;
      threatRef.current = world ? { x: world.x, y: world.y } : null;
      threatRing.visible = flee && world !== null;
      if (world) {
        threatRing.position.set(world.x, world.y, 2);
        threatRing.scale.setScalar(params.fleeRadius);
      }

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
      crows.update(flockRef.current, params, running ? delta * timeScale : 0);
      stage.setSky(display.sky);
      guide.group.visible = display.range;
      if (display.range) {
        guide.update(flockRef.current, params);
      }
      stage.render();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      pointer.detach();
      crows.dispose();
      guide.dispose();
      threatRing.geometry.dispose();
      threatRing.material.dispose();
      stage.dispose();
    };
  }, [canvasRef]);

  return handleRef.current;
}
