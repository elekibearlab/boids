import type { Area, Boid } from '@/core/boids3d';
import type { Params } from '@/core/params';
import shaderCode from '@/core/boids3d.wgsl?raw';

/** Threads per workgroup. Must match @workgroup_size in core/boids3d.wgsl */
const WORKGROUP_SIZE = 64;
/**
 * Floats per crow in a GPU buffer. WGSL lines up each vec3f on 16 bytes,
 * so a Boid is position (3) + padding (1) + velocity (3) + padding (1)
 */
const FLOATS_PER_BOID = 8;
/** Bytes of the Params struct in core/boids3d.wgsl: 11 numbers, padding, then area (vec3f) at 48 */
const PARAMS_BYTES = 64;

/**
 * The flock on the GPU. It lives in two buffers: each step reads one and writes the other,
 * then they swap. Nothing comes back to the CPU; the crow renderer reads the current buffer directly.
 */
export type GpuFlock = {
  /** The two buffers. The renderer makes a bind group for each */
  buffers: [GPUBuffer, GPUBuffer];
  /** Which of the two buffers holds the flock now */
  current: () => 0 | 1;
  count: number;
  /** Adds one step to the command encoder. It runs when the encoder is submitted */
  step: (encoder: GPUCommandEncoder, params: Params, area: Area, dt: number) => void;
  /** Replaces the flock with one made on the CPU (createFlock in core/boids3d.ts) */
  load: (flock: Boid[]) => void;
  dispose: () => void;
};

/**
 * Makes the compute pipeline from core/boids3d.wgsl and the buffers for the flock.
 *
 * @param device WebGPU device
 * @param flock  Flock at the start. It also sets the number of crows
 */
export function createGpuFlock(device: GPUDevice, flock: Boid[]): GpuFlock {
  const count = flock.length;
  const makeBuffer = () =>
    device.createBuffer({
      size: count * FLOATS_PER_BOID * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  const buffers: [GPUBuffer, GPUBuffer] = [makeBuffer(), makeBuffer()];
  const paramsBuffer = device.createBuffer({
    size: PARAMS_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: device.createShaderModule({ code: shaderCode }), entryPoint: 'main' },
  });
  // Bind group 0 reads buffer 0 and writes buffer 1; bind group 1 is the other way round
  const bindGroups = ([0, 1] as const).map((from) =>
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: buffers[from] } },
        { binding: 2, resource: { buffer: buffers[1 - from] } },
      ],
    }),
  );

  let current: 0 | 1 = 0;
  const paramsData = new ArrayBuffer(PARAMS_BYTES);
  const paramsFloats = new Float32Array(paramsData);
  const paramsUints = new Uint32Array(paramsData);

  const load = (next: Boid[]) => {
    const data = new Float32Array(count * FLOATS_PER_BOID);
    next.forEach(({ position, velocity }, i) => {
      data.set(
        [position.x, position.y, position.z, 0, velocity.x, velocity.y, velocity.z, 0],
        i * FLOATS_PER_BOID,
      );
    });
    device.queue.writeBuffer(buffers[current], 0, data);
  };
  load(flock);

  return {
    buffers,
    current: () => current,
    count,
    step: (encoder, params, area, dt) => {
      // Same order as the Params struct in core/boids3d.wgsl
      paramsUints[0] = count;
      paramsFloats.set(
        [
          dt,
          params.separationRadius,
          params.alignmentRadius,
          params.cohesionRadius,
          params.separationWeight,
          params.alignmentWeight,
          params.cohesionWeight,
          params.minSpeed,
          params.maxSpeed,
          params.avoidWallWeight,
        ],
        1,
      );
      paramsFloats.set([area.width, area.height, area.depth], 12);
      device.queue.writeBuffer(paramsBuffer, 0, paramsData);

      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroups[current]);
      pass.dispatchWorkgroups(Math.ceil(count / WORKGROUP_SIZE));
      pass.end();
      current = current === 0 ? 1 : 0;
    },
    load,
    dispose: () => {
      buffers[0].destroy();
      buffers[1].destroy();
      paramsBuffer.destroy();
    },
  };
}
