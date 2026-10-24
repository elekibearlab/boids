import { useEffect, useRef, type RefObject } from 'react';
import type { Area, Boid } from '@/core/boids3d';
import { createCrowRenderer, type CrowRenderer } from './crowRenderer';
import { createGpuFlock, type GpuFlock } from './gpuFlock';
import { createStage, type Stage } from './createStage';
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

/**
 * Sets up WebGPU on the canvas and flies the flock on the GPU.
 * Same loop as the 3D screen, but step() adds a compute pass instead of calling core/boids3d.ts,
 * and the flock stays on the GPU: the CPU only sends the numbers from the panel and the camera.
 *
 * @param canvasRef    Canvas to draw on
 * @param area         The area the flock stays in
 * @param initialFlock Flock at the start, made on the CPU. It also sets the number of crows
 * @param options      Play state, speed, rules, camera and display. Each render passes the latest values
 */
export function useBoidsScene(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  area: Area,
  initialFlock: Boid[],
  options: BoidsSceneOptions,
): BoidsSceneHandle {
  const timeRef = useRef(0);
  const stageRef = useRef<Stage | null>(null);
  const flockRef = useRef<GpuFlock | null>(null);
  // The draw loop is made only once, so it reads the latest props through a ref
  const optionsRef = useRef(options);
  optionsRef.current = options;
  /** Steps asked for since the last frame. They are added to the next frame's commands */
  const pendingStepsRef = useRef(0);

  const handleRef = useRef<BoidsSceneHandle>({
    step: () => {
      pendingStepsRef.current += 1;
    },
    load: (flock) => {
      flockRef.current?.load(flock);
      timeRef.current = 0;
    },
    zoom: (scale) => stageRef.current?.zoom(scale),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    // Setting up WebGPU is async, so the cleanup may come before it is ready
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};

    createStage(canvas, area).then((stage) => {
      if (disposed) {
        stage?.dispose();
        return;
      }
      if (!stage) {
        optionsRef.current.onUnsupported();
        return;
      }
      stageRef.current = stage;
      const flock = createGpuFlock(stage.device, initialFlock);
      flockRef.current = flock;
      const crows: CrowRenderer = createCrowRenderer(
        stage.device,
        stage.format,
        stage.depthFormat,
        flock,
      );

      stage.resize(canvas.clientWidth, canvas.clientHeight);
      const observer = new ResizeObserver(([entry]) =>
        stage.resize(entry.contentRect.width, entry.contentRect.height),
      );
      observer.observe(canvas);

      let last = performance.now();
      let pending = 0;
      let sinceStats = 0;
      let frames = 0;
      const loop = (now: number) => {
        const delta = Math.min((now - last) / 1000, MAX_DELTA);
        last = now;
        const { running, timeScale, params, autoRotate, display, onStats } = optionsRef.current;

        // Fixed steps, as on the CPU. Each one is a compute pass in this frame's commands
        let steps = pendingStepsRef.current;
        pendingStepsRef.current = 0;
        if (running) {
          pending += delta * timeScale;
          for (let i = 0; i < MAX_STEPS_PER_FRAME && pending >= STEP_SECONDS; i++) {
            pending -= STEP_SECONDS;
            steps++;
          }
          pending = Math.min(pending, STEP_SECONDS);
        }
        const encoder = stage.device.createCommandEncoder();
        for (let i = 0; i < steps; i++) {
          flock.step(encoder, params, area, STEP_SECONDS);
        }
        timeRef.current += steps * STEP_SECONDS;

        stage.controls.autoRotate = autoRotate;
        stage.setSky(display.sky);
        const { viewProjection, target } = stage.beginFrame();
        const pass = encoder.beginRenderPass(target);
        crows.draw(pass, viewProjection, timeRef.current);
        pass.end();
        stage.device.queue.submit([encoder.finish()]);

        frames++;
        sinceStats += delta;
        if (sinceStats >= STATS_INTERVAL) {
          onStats({ time: timeRef.current, count: flock.count, fps: frames / sinceStats });
          frames = 0;
          sinceStats = 0;
        }
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);

      cleanup = () => {
        observer.disconnect();
        crows.dispose();
        flock.dispose();
        flockRef.current = null;
        stageRef.current = null;
        stage.dispose();
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [canvasRef]);

  return handleRef.current;
}
