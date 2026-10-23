import {
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import type { Boid } from '@/core/boids2d';
import type { Params } from '@/core/params';

/** The two pictures: wings up and wings down. Showing them in turn makes the crow flap */
const FRAMES = [
  { url: `${import.meta.env.BASE_URL}textures/karasu1.png`, aspect: 500 / 510 },
  { url: `${import.meta.env.BASE_URL}textures/karasu2.png`, aspect: 567 / 509 },
];
/** Height of a crow (world units). About the separation distance, so crows in a flock only just touch */
const CROW_SIZE = 5.5;
/** Flaps per second at the lowest and highest speed. Faster crows flap faster */
const SLOW_FLAPS = 2;
const FAST_FLAPS = 5;
/** Most a crow tilts up or down (radians). The picture is seen from the side, so a steep tilt looks odd */
const MAX_TILT = 0.6;

/**
 * Draws all crows with two InstancedMeshes, one for each picture.
 * Each frame, each crow is shown in one of them and hidden (scale 0) in the other.
 */
export type CrowSprites = {
  meshes: InstancedMesh[];
  /** Call this every frame. Moves and turns the crows, and moves their wings forward by deltaSeconds */
  update: (flock: Boid[], params: Params, deltaSeconds: number) => void;
  dispose: () => void;
};

/**
 * Makes the crow sprites.
 *
 * @param count Number of crows. A new count needs new sprites
 */
export function createCrowSprites(count: number): CrowSprites {
  const loader = new TextureLoader();
  const meshes = FRAMES.map((frame) => {
    const texture = loader.load(frame.url);
    texture.colorSpace = SRGBColorSpace;
    const geometry = new PlaneGeometry(CROW_SIZE * frame.aspect, CROW_SIZE);
    // alphaTest cuts out the clear part of the picture, so crows overlap cleanly without sorting.
    // DoubleSide, because a crow flying right is flipped (scale x = -1) and shows its back face
    const material = new MeshBasicMaterial({ map: texture, alphaTest: 0.5, side: DoubleSide });
    return new InstancedMesh(geometry, material, count);
  });

  // Each crow starts at a random point in its flap, so the flock doesn't flap all at once
  const phase = Float32Array.from({ length: count }, () => Math.random());
  const dummy = new Object3D();
  const hidden = new Matrix4().makeScale(0, 0, 0);

  return {
    meshes,
    update: (flock, params, deltaSeconds) => {
      flock.forEach((boid, i) => {
        const { x, y } = boid.velocity;
        const speed = Math.hypot(x, y);
        const fast = (speed - params.minSpeed) / Math.max(params.maxSpeed - params.minSpeed, 1);
        phase[i] = (phase[i] + deltaSeconds * (SLOW_FLAPS + (FAST_FLAPS - SLOW_FLAPS) * fast)) % 1;

        // The picture faces left. Flip it when flying right, and tilt the head up or down with the climb
        const facingRight = x > 0;
        const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.atan2(y, Math.abs(x))));
        dummy.position.set(boid.position.x, boid.position.y, 0);
        dummy.rotation.z = facingRight ? tilt : -tilt;
        dummy.scale.set(facingRight ? -1 : 1, 1, 1);
        dummy.updateMatrix();

        const shown = phase[i] < 0.5 ? 0 : 1;
        meshes[shown].setMatrixAt(i, dummy.matrix);
        meshes[1 - shown].setMatrixAt(i, hidden);
      });
      for (const mesh of meshes) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose: () => {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
        mesh.dispose();
      }
    },
  };
}
