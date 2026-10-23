import {
  CanvasTexture,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Area } from '@/core/boids2d';
import { paintSky, type Sky } from '@/shared/sky';

/**
 * Room shown around the area (world units). Crows are pushed back only after they leave the area,
 * and a crowded flock presses its edge crows out, so they go a little past it (see avoidWallWeight in params.ts)
 */
const PADDING = 8;
/** Space around that (CSS px). More at the top, so the crows don't fly under the text on the top left */
const MARGIN_X = 16;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 16;

/**
 * Base for drawing: the renderer, camera and sky together.
 */
export type Stage = {
  scene: Scene;
  /** Call this when the canvas size on screen changes (CSS px) */
  resize: (width: number, height: number) => void;
  /** Changes the sky behind the crows. Does nothing if it is already that sky */
  setSky: (sky: Sky) => void;
  render: () => void;
  /** Turns a screen position (px, the top left of the canvas is 0) into a world position */
  toWorld: (px: number, py: number) => Vector3;
  dispose: () => void;
};

/**
 * Makes an orthographic camera that shows the whole area, seen from the side, with the sky behind.
 * It is 2D, so OrthographicCamera has no perspective. The area's center is (0, 0), +y is up.
 *
 * @param canvas Where to draw
 * @param area   The area the flock stays in (world units)
 */
export function createStage(canvas: HTMLCanvasElement, area: Area): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });

  const scene = new Scene();
  // The sky is set by the first setSky call, before the first frame is drawn
  let sky: { id: Sky; texture: CanvasTexture } | null = null;
  const setSky = (next: Sky) => {
    if (sky?.id === next) {
      return;
    }
    sky?.texture.dispose();
    const texture = new CanvasTexture(paintSky(next));
    texture.colorSpace = SRGBColorSpace;
    scene.background = texture;
    sky = { id: next, texture };
  };

  const camera = new OrthographicCamera();
  camera.position.z = 10;

  const resize = (width: number, height: number) => {
    // The pixel ratio changes with the browser zoom or when the window moves to another monitor, so set it every time
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);

    // The largest scale (px per world unit) that fits the whole area and its padding inside the margins
    const areaWidth = width - MARGIN_X * 2;
    const areaHeight = height - MARGIN_TOP - MARGIN_BOTTOM;
    const pixelsPerUnit = Math.max(
      Math.min(areaWidth / (area.width + PADDING * 2), areaHeight / (area.height + PADDING * 2)),
      0.01,
    );
    // Center the area inside the margins. The top margin is bigger, so the area sits lower and the camera center moves up
    const centerY = (MARGIN_BOTTOM - MARGIN_TOP) / 2 / pixelsPerUnit;
    camera.left = -width / 2 / pixelsPerUnit;
    camera.right = width / 2 / pixelsPerUnit;
    camera.top = height / 2 / pixelsPerUnit - centerY;
    camera.bottom = -height / 2 / pixelsPerUnit - centerY;
    camera.updateProjectionMatrix();
  };

  const toWorld = (px: number, py: number) => {
    const { width, height } = canvas.getBoundingClientRect();
    return new Vector3((px / width) * 2 - 1, -(py / height) * 2 + 1, 0).unproject(camera);
  };

  return {
    scene,
    resize,
    setSky,
    render: () => renderer.render(scene, camera),
    toWorld,
    dispose: () => {
      sky?.texture.dispose();
      renderer.dispose();
    },
  };
}
