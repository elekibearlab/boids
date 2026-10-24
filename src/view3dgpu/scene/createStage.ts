import { Matrix4, PerspectiveCamera, WebGPUCoordinateSystem } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Area } from '@/core/boids3d';
import { skyCss, type Sky } from '@/shared/sky';

/** Camera distance from the center, as a multiple of the area's width. Same as the 3D screen */
const CAMERA_DISTANCE = 1;
const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';

/**
 * Base for drawing with WebGPU: the device, the canvas, the depth buffer and the camera.
 * three.js is used only for the camera math and mouse control (OrbitControls); WebGPU draws everything.
 */
export type Stage = {
  device: GPUDevice;
  format: GPUTextureFormat;
  depthFormat: GPUTextureFormat;
  controls: OrbitControls;
  /** Call this when the canvas size on screen changes (CSS px) */
  resize: (width: number, height: number) => void;
  /** Changes the sky. The canvas is clear, so the sky is the CSS background behind it */
  setSky: (sky: Sky) => void;
  /** Moves the camera closer (scale < 1) or farther away (scale > 1) */
  zoom: (scale: number) => void;
  /** Starts a frame: updates the camera and returns the matrix and the render pass settings for this frame */
  beginFrame: () => { viewProjection: Float32Array; target: GPURenderPassDescriptor };
  dispose: () => void;
};

/**
 * Sets up WebGPU on the canvas. Returns null when the browser has no WebGPU (or no GPU for it).
 *
 * @param canvas Where to draw
 * @param area   The area the flock stays in (world units)
 */
export async function createStage(canvas: HTMLCanvasElement, area: Area): Promise<Stage | null> {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) {
    return null;
  }
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    return null;
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  // premultiplied: the clear color is see-through, so the CSS sky shows behind the crows
  context.configure({ device, format, alphaMode: 'premultiplied' });

  // three.js cameras make WebGL's depth range (−1 to 1) by default. WebGPU uses 0 to 1
  const camera = new PerspectiveCamera(45, 1, 0.5, area.width * 10);
  camera.coordinateSystem = WebGPUCoordinateSystem;
  camera.position.set(0.9, -0.15, 1).setLength(area.width * CAMERA_DISTANCE);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  let depth: GPUTexture | null = null;
  let sky: Sky | null = null;
  const viewProjection = new Matrix4();

  return {
    device,
    format,
    depthFormat: DEPTH_FORMAT,
    controls,
    resize: (width, height) => {
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // The depth buffer must be the same size as the canvas
      depth?.destroy();
      depth = device.createTexture({
        size: [canvas.width, canvas.height],
        format: DEPTH_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    },
    setSky: (next) => {
      if (next !== sky) {
        canvas.style.background = skyCss(next);
        sky = next;
      }
    },
    zoom: (scale) => {
      camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
    },
    beginFrame: () => {
      controls.update();
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      return {
        viewProjection: new Float32Array(viewProjection.elements),
        target: {
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: 'clear',
              storeOp: 'store',
            },
          ],
          depthStencilAttachment: {
            view: depth!.createView(),
            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
          },
        },
      };
    },
    dispose: () => {
      controls.dispose();
      depth?.destroy();
      context.unconfigure();
      device.destroy();
    },
  };
}
