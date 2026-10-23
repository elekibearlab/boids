import type { LocalizedText } from './i18n';

/** Which sky is behind the crows */
export type Sky = 'day' | 'dusk';

/**
 * The skies to choose from. Each has colors from the top of the screen to the bottom,
 * light enough that the dark gray crows stand out on every part of it,
 * and a horizon color that the 3D fog fades into
 */
export const SKIES: { id: Sky; name: LocalizedText; stops: [number, string][]; horizon: number }[] =
  [
    {
      id: 'day',
      name: { ja: '青空', en: 'Blue sky' },
      stops: [
        [0, '#5b9be0'],
        [0.6, '#9fcdf2'],
        [1, '#e1f1fb'],
      ],
      horizon: 0xc4e2f8,
    },
    {
      id: 'dusk',
      name: { ja: '夕方', en: 'Dusk' },
      stops: [
        [0, '#7c8fc4'],
        [0.55, '#e9a27f'],
        [1, '#fbd8a3'],
      ],
      horizon: 0xe9a27f,
    },
  ];

/** The sky at the start */
export const FIRST_SKY: Sky = 'day';

/**
 * Paints a sky on a small canvas. 2D and 3D both use it as the scene background.
 * It is a gradient, so a few pixels are enough; the GPU stretches it smoothly.
 * It knows nothing about three.js: each view wraps it in its own CanvasTexture.
 *
 * @param sky Which sky to paint
 */
export function paintSky(sky: Sky): HTMLCanvasElement {
  const { stops } = SKIES.find((item) => item.id === sky)!;
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  for (const [offset, color] of stops) {
    gradient.addColorStop(offset, color);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * The horizon color of a sky, for the 3D fog.
 *
 * @param sky Which sky
 */
export function horizonOf(sky: Sky): number {
  return SKIES.find((item) => item.id === sky)!.horizon;
}
