import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Boid } from '@/core/boids3d';
import type { Params } from '@/core/params';

/** Colors of a bird. The crow uses the same colors as the 2D picture */
export type BirdColors = {
  body: number;
  beak: number;
};

export const CROW_COLORS: BirdColors = { body: 0x4a4440, beak: 0xf4f3a4 };
export const HAWK_COLORS: BirdColors = { body: 0x8a5a33, beak: 0xe8c547 };

/** Flaps per second at the lowest and highest speed. Faster birds flap faster */
const SLOW_FLAPS = 2;
const FAST_FLAPS = 5;
/** How far a wing swings up and down (radians) */
const FLAP_ANGLE = 0.6;
/** Where the wings join the body (local, for the left wing; the right wing is the mirror) */
const SHOULDER = new Vector3(0.4, 0.2, 0.1);
/** Size of one wing: span, thickness, width front to back */
const WING = { span: 1.8, thickness: 0.12, width: 1.1 };

/**
 * A box of one color, moved to its place on the bird.
 * The parts are made facing +z (forward) with +y up, the same way the 2D picture is drawn, but in blocks
 */
function block(
  size: [number, number, number],
  position: [number, number, number],
  color: number,
): BufferGeometry {
  const geometry = new BoxGeometry(...size).translate(...position);
  const { r, g, b } = new Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors.set([r, g, b], i);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

/**
 * The parts that don't move, as one shape: body, head, beak, eyes and tail.
 * Joining them means the whole flock's bodies are one draw call
 */
function bodyGeometry(colors: BirdColors): BufferGeometry {
  return mergeGeometries([
    block([0.9, 0.8, 2.0], [0, 0, 0], colors.body),
    block([0.85, 0.85, 0.85], [0, 0.35, 1.2], colors.body),
    block([0.35, 0.25, 0.6], [0, 0.3, 1.85], colors.beak),
    block([0.12, 0.32, 0.32], [0.46, 0.45, 1.3], 0xffffff),
    block([0.12, 0.32, 0.32], [-0.46, 0.45, 1.3], 0xffffff),
    block([0.06, 0.14, 0.14], [0.53, 0.45, 1.35], 0x1a1414),
    block([0.06, 0.14, 0.14], [-0.53, 0.45, 1.35], 0x1a1414),
    block([0.7, 0.15, 0.8], [0, 0.05, -1.35], colors.body),
  ]);
}

/**
 * Draws a flock of block birds with three InstancedMeshes: the body, the left wings and the right wings.
 * The wings are separate so each one can swing around its shoulder.
 */
export type BirdMesh = {
  meshes: InstancedMesh[];
  /** Call this every frame. Moves and turns the birds, and moves their wings forward by deltaSeconds */
  update: (flock: Boid[], params: Params, deltaSeconds: number) => void;
  dispose: () => void;
};

/**
 * Makes block birds.
 *
 * @param count  Number of birds. A new count needs a new mesh
 * @param colors Body and beak colors
 * @param size   Scale of the whole bird. 1 is a crow, about 3.5 long
 */
export function createBirdMesh(count: number, colors: BirdColors, size = 1): BirdMesh {
  const material = new MeshLambertMaterial({ vertexColors: true });
  const body = new InstancedMesh(bodyGeometry(colors), material, count);
  // A wing that starts at its shoulder (x = 0) and goes out to +x. The right wing is the same shape going to −x
  const leftWing = new InstancedMesh(
    block([WING.span, WING.thickness, WING.width], [WING.span / 2, 0, 0], colors.body),
    material,
    count,
  );
  const rightWing = new InstancedMesh(
    block([WING.span, WING.thickness, WING.width], [-WING.span / 2, 0, 0], colors.body),
    material,
    count,
  );
  const meshes = [body, leftWing, rightWing];

  // Each bird starts at a random point in its flap, so the flock doesn't flap all at once
  const phase = Float32Array.from({ length: count }, () => Math.random());
  const up = new Vector3(0, 1, 0);
  const origin = new Vector3();
  const facing = new Vector3();
  const rotation = new Quaternion();
  const scale = new Vector3().setScalar(size);
  const birdMatrix = new Matrix4();
  const lookMatrix = new Matrix4();
  const wingMatrix = new Matrix4();
  const swing = new Matrix4();
  const leftShoulder = new Matrix4().makeTranslation(SHOULDER.x, SHOULDER.y, SHOULDER.z);
  const rightShoulder = new Matrix4().makeTranslation(-SHOULDER.x, SHOULDER.y, SHOULDER.z);

  return {
    meshes,
    update: (flock, params, deltaSeconds) => {
      flock.forEach((boid, i) => {
        const { x, y, z } = boid.velocity;
        const speed = Math.hypot(x, y, z);
        const fast = (speed - params.minSpeed) / Math.max(params.maxSpeed - params.minSpeed, 1);
        phase[i] = (phase[i] + deltaSeconds * (SLOW_FLAPS + (FAST_FLAPS - SLOW_FLAPS) * fast)) % 1;

        // Face the way it flies: lookAt points the local +z along the velocity
        facing.set(x, y, z);
        rotation.setFromRotationMatrix(lookMatrix.lookAt(facing, origin, up));
        birdMatrix.compose(
          new Vector3(boid.position.x, boid.position.y, boid.position.z),
          rotation,
          scale,
        );
        body.setMatrixAt(i, birdMatrix);

        // Bird → shoulder → swing around the forward axis. The two wings swing the opposite way, so both go up together
        const angle = Math.sin(phase[i] * Math.PI * 2) * FLAP_ANGLE;
        swing.makeRotationZ(angle);
        leftWing.setMatrixAt(
          i,
          wingMatrix.multiplyMatrices(birdMatrix, leftShoulder).multiply(swing),
        );
        swing.makeRotationZ(-angle);
        rightWing.setMatrixAt(
          i,
          wingMatrix.multiplyMatrices(birdMatrix, rightShoulder).multiply(swing),
        );
      });
      for (const mesh of meshes) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose: () => {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
      material.dispose();
    },
  };
}
