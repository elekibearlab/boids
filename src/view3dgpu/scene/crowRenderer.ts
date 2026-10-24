import { BoxGeometry } from 'three';
import shaderCode from './crow.wgsl?raw';
import type { GpuFlock } from './gpuFlock';

/** Colors of the crow. Same as the 2D picture and the 3D screen */
const BODY = 0x4a4440;
const BEAK = 0xf4f3a4;
const EYE = 0xffffff;
const PUPIL = 0x1a1414;
/** Size of one wing: span, thickness, width front to back. Same as the 3D screen */
const WING = { span: 1.8, thickness: 0.12, width: 1.1 };
/** Where the left wing joins the body. Must match SHOULDER in crow.wgsl */
const SHOULDER = { x: 0.4, y: 0.2, z: 0.1 };
/** Floats per vertex: position (3), normal (3), color (3), part (1) */
const FLOATS_PER_VERTEX = 10;
/** Bytes of the Camera struct in crow.wgsl: a 4 × 4 matrix, then sun (vec3f) and time */
const CAMERA_BYTES = 80;
/** Direction toward the sun: from the front right, a little above */
const SUN = [0.6, 0.6, 0.5].map((v, _, all) => v / Math.hypot(...all));

/** The color as 0–1 numbers, kept in sRGB because the canvas shows them as they are */
const rgb = (hex: number) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);

/**
 * The vertices of one box, ready for the GPU.
 *
 * @param size     Width, height, depth
 * @param position Center of the box (local, the crow faces +z)
 * @param color    Color of the box
 * @param part     0 = body, +1 = left wing, −1 = right wing
 */
function block(
  size: [number, number, number],
  position: [number, number, number],
  color: number,
  part: number,
): number[] {
  const geometry = new BoxGeometry(...size).translate(...position).toNonIndexed();
  const positions = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  const vertices: number[] = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    vertices.push(
      ...positions.slice(i * 3, i * 3 + 3),
      ...normals.slice(i * 3, i * 3 + 3),
      ...rgb(color),
      part,
    );
  }
  geometry.dispose();
  return vertices;
}

/**
 * One crow made of boxes, the same shape as the 3D screen. The wings are already at their shoulders;
 * the vertex shader swings them by `part`
 */
function crowVertices(): Float32Array {
  const wingX = SHOULDER.x + WING.span / 2;
  return new Float32Array([
    ...block([0.9, 0.8, 2.0], [0, 0, 0], BODY, 0),
    ...block([0.85, 0.85, 0.85], [0, 0.35, 1.2], BODY, 0),
    ...block([0.35, 0.25, 0.6], [0, 0.3, 1.85], BEAK, 0),
    ...block([0.12, 0.32, 0.32], [0.46, 0.45, 1.3], EYE, 0),
    ...block([0.12, 0.32, 0.32], [-0.46, 0.45, 1.3], EYE, 0),
    ...block([0.06, 0.14, 0.14], [0.53, 0.45, 1.35], PUPIL, 0),
    ...block([0.06, 0.14, 0.14], [-0.53, 0.45, 1.35], PUPIL, 0),
    ...block([0.7, 0.15, 0.8], [0, 0.05, -1.35], BODY, 0),
    ...block([WING.span, WING.thickness, WING.width], [wingX, SHOULDER.y, SHOULDER.z], BODY, 1),
    ...block([WING.span, WING.thickness, WING.width], [-wingX, SHOULDER.y, SHOULDER.z], BODY, -1),
  ]);
}

/**
 * Draws every crow in the flock with one draw call: the crow's vertices once, and one instance per crow.
 */
export type CrowRenderer = {
  /** Adds the drawing to a render pass that is already open */
  draw: (pass: GPURenderPassEncoder, viewProjection: Float32Array, time: number) => void;
  dispose: () => void;
};

/**
 * Makes the render pipeline from crow.wgsl. It reads the flock buffer that the compute shader writes.
 *
 * @param device       WebGPU device
 * @param format       Color format of the canvas
 * @param depthFormat  Format of the depth texture
 * @param flock        The flock on the GPU
 */
export function createCrowRenderer(
  device: GPUDevice,
  format: GPUTextureFormat,
  depthFormat: GPUTextureFormat,
  flock: GpuFlock,
): CrowRenderer {
  const vertices = crowVertices();
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);
  const vertexCount = vertices.length / FLOATS_PER_VERTEX;

  const cameraBuffer = device.createBuffer({
    size: CAMERA_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraData = new Float32Array(CAMERA_BYTES / 4);

  const module = device.createShaderModule({ code: shaderCode });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: FLOATS_PER_VERTEX * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
            { shaderLocation: 1, offset: 12, format: 'float32x3' },
            { shaderLocation: 2, offset: 24, format: 'float32x3' },
            { shaderLocation: 3, offset: 36, format: 'float32' },
          ],
        },
      ],
    },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list', cullMode: 'back' },
    depthStencil: { format: depthFormat, depthWriteEnabled: true, depthCompare: 'less' },
  });
  // One bind group for each flock buffer, so drawing can follow whichever one is current
  const bindGroups = flock.buffers.map((buffer) =>
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: cameraBuffer } },
        { binding: 1, resource: { buffer } },
      ],
    }),
  );

  return {
    draw: (pass, viewProjection, time) => {
      cameraData.set(viewProjection, 0);
      cameraData.set(SUN, 16);
      cameraData[19] = time;
      device.queue.writeBuffer(cameraBuffer, 0, cameraData);

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroups[flock.current()]);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.draw(vertexCount, flock.count);
    },
    dispose: () => {
      vertexBuffer.destroy();
      cameraBuffer.destroy();
    },
  };
}
