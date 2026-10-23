import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Fog,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Area } from '@/core/boids3d';
import { horizonOf, paintSky, type Sky } from '@/shared/sky';

/** Camera distance from the center, as a multiple of the area's width */
const CAMERA_DISTANCE = 1;

/**
 * Base for drawing: the renderer, camera and lights together.
 */
export type Stage = {
  scene: Scene;
  controls: OrbitControls;
  /** Call this when the canvas size on screen changes */
  resize: (width: number, height: number) => void;
  /** Changes the sky behind the crows, and the fog color with it. Does nothing if it is already that sky */
  setSky: (sky: Sky) => void;
  /** Turns the fog on or off */
  setFog: (enabled: boolean) => void;
  /** Moves the point the camera turns around, and the camera with it, so the view keeps its angle */
  moveTarget: (target: Vector3) => void;
  render: () => void;
  /** Moves the camera closer (scale < 1) or farther away (scale > 1). For the + / − buttons, because phones have no mouse wheel */
  zoom: (scale: number) => void;
  dispose: () => void;
};

/**
 * Makes a camera that looks at the area from a little below, like looking up at crows in the sky, plus lights and the sky.
 * The area's center is at (0, 0, 0), so OrbitControls can simply turn around that point.
 *
 * @param canvas Where to draw
 * @param area   The area the flock stays in (world units)
 */
export function createStage(canvas: HTMLCanvasElement, area: Area): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true });

  const scene = new Scene();

  const camera = new PerspectiveCamera(45, 1, 0.5, area.width * 10);
  camera.position.set(0.9, -0.15, 1).setLength(area.width * CAMERA_DISTANCE);

  // The near half stays clear, and the far half fades into the color of the sky near the horizon
  const distance = camera.position.length();
  const fog = new Fog(0xffffff, distance - area.depth * 0.2, distance + area.width * 0.8);

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
    fog.color.setHex(horizonOf(next));
    sky = { id: next, texture };
  };

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // Warm light from the low sun, and a cool light from the other side, so the dark crows still show their shape
  scene.add(new AmbientLight(0xffffff, 0.9));
  const sun = new DirectionalLight(0xffd2a8, 2.2);
  sun.position.set(1, 0.6, 0.4);
  scene.add(sun);
  const rim = new DirectionalLight(0x8fa4ff, 1);
  rim.position.set(-1, 0.3, -0.8);
  scene.add(rim);

  // Edges of the area, faint. Crows are pushed back only after they leave it, so they may go a little past
  const frame = new LineSegments(
    new EdgesGeometry(new BoxGeometry(area.width, area.height, area.depth)),
    new LineBasicMaterial({ color: new Color(0xffffff), transparent: true, opacity: 0.35 }),
  );
  scene.add(frame);

  return {
    scene,
    controls,
    resize: (width, height) => {
      // The pixel ratio changes with the browser zoom or when the window moves to another monitor, so set it every time
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    setSky,
    setFog: (enabled) => {
      // three.js rebuilds shaders when scene.fog is set or removed, so switching only needs one assignment
      scene.fog = enabled ? fog : null;
    },
    moveTarget: (target) => {
      const offset = target.clone().sub(controls.target);
      controls.target.add(offset);
      camera.position.add(offset);
    },
    render: () => {
      controls.update();
      renderer.render(scene, camera);
    },
    zoom: (scale) => {
      // Same as the mouse wheel: keep the direction to the point the camera turns around, and change only the distance
      camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
    },
    dispose: () => {
      controls.dispose();
      frame.geometry.dispose();
      frame.material.dispose();
      sky?.texture.dispose();
      renderer.dispose();
    },
  };
}
