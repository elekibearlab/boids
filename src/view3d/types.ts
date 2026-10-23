import type { Area, Boid } from '@/core/boids3d';
import type { Params } from '@/core/params';
import type { LocalizedText } from '@/shared/i18n';
import type { Sky } from '@/shared/sky';

/** Numbers shown on screen. Sent a few times a second, not every frame, so React doesn't re-render all the time */
export type FlockStats = {
  time: number;
  count: number;
};

/** An area size to choose from on the panel */
export type AreaChoice = {
  id: string;
  name: LocalizedText;
  area: Area;
};

/** Lets other code control the scene. Passed to Boids3D through a React ref */
export type BoidsSceneHandle = {
  /** Moves forward one frame (1/60 s) */
  step: () => void;
  /** Replaces the flock and sets the time back to 0 */
  load: (flock: Boid[]) => void;
  /** Moves the camera closer (scale < 1) or farther away (scale > 1) */
  zoom: (scale: number) => void;
};

/** Helpers for explaining and looks. None of them change how the crows move */
export type Display = {
  /** Draws how far one crow sees for each rule, and lines to the crows it sees */
  range: boolean;
  /** The camera follows one crow */
  follow: boolean;
  /** Crows farther away fade into the sky */
  fog: boolean;
  /** The sky behind the crows */
  sky: Sky;
};

export type BoidsSceneOptions = {
  /** Whether the crows move on their own */
  running: boolean;
  /** Speed of time. 1 is real time */
  timeScale: number;
  params: Params;
  /** A hawk flies through the flock, and the crows flee from it */
  flee: boolean;
  /** The crows circle over the roost at the center */
  roost: boolean;
  /** Whether the camera turns on its own */
  autoRotate: boolean;
  display: Display;
  onStats: (stats: FlockStats) => void;
};
