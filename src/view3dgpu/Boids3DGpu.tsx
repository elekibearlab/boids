import { useRef, useState } from 'react';
import { createFlock } from '@/core/boids3d';
import { DEFAULT_PARAMS, type Params } from '@/core/params';
import { FIRST_PRESET, PRESETS, type Preset } from '@/data/presets';
import { Workspace } from '@/ui';
import { t } from '@/shared/i18n';
import { FIRST_SKY } from '@/shared/sky';
import { useKeyboardShortcuts } from '@/shared/useKeyboardShortcuts';
import type { AreaChoice, BoidsSceneHandle, Display, FlockStats } from './types';
import { BoidsCanvas } from './components/BoidsCanvas';
import { ControlPanel } from './components/ControlPanel';
import styles from './components/styles.module.css';

/**
 * Only the three rules. The predator and the roost stay on the 3D screen,
 * so this screen shows one thing: the same rules, run on the GPU
 */
const GPU_PRESETS = PRESETS.filter((preset) => !preset.flee && !preset.roost);
/** Numbers of crows to choose from. Far more than the CPU screens can move smoothly */
const COUNTS = [2000, 5000, 10000, 20000, 40000];
const DEFAULT_COUNT = 10000;
/**
 * Area sizes to choose from (world units). The 3D screen's sizes, larger, so a big flock
 * has about the same room per crow. The crows keep their size, so in a bigger area they look smaller
 */
const AREAS: AreaChoice[] = [
  { id: 's', name: { ja: '狭い', en: 'Small' }, area: { width: 320, height: 140, depth: 200 } },
  { id: 'm', name: { ja: 'ふつう', en: 'Medium' }, area: { width: 480, height: 210, depth: 300 } },
  { id: 'l', name: { ja: '広い', en: 'Large' }, area: { width: 640, height: 280, depth: 400 } },
  {
    id: 'xl',
    name: { ja: 'とても広い', en: 'Extra large' },
    area: { width: 960, height: 420, depth: 600 },
  },
];
const DEFAULT_AREA = AREAS[1];
const FIRST_DISPLAY: Display = { sky: FIRST_SKY };
/** How much one press of zoom changes the camera distance */
const ZOOM_STEP = 1.25;

/** Default distances and limits, with the preset's weights */
const paramsFor = (preset: Preset): Params => ({ ...DEFAULT_PARAMS, ...preset.weights });

/**
 * The 3D flock computed on the GPU with WebGPU. The rules are the same as the 3D screen
 * (core/boids3d.wgsl is core/boids3d.ts written for the GPU); only where they run is different.
 */
export function Boids3DGpu() {
  const sceneRef = useRef<BoidsSceneHandle>(null);
  const [preset, setPreset] = useState(FIRST_PRESET);
  const [params, setParams] = useState(() => paramsFor(FIRST_PRESET));
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [areaChoice, setAreaChoice] = useState(DEFAULT_AREA);
  const area = areaChoice.area;
  // A new count or area makes a new canvas, so keep the first flock for it
  const [initialFlock, setInitialFlock] = useState(() => createFlock(count, area, params));
  const [running, setRunning] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [timeScale, setTimeScale] = useState(1);
  const [display, setDisplay] = useState(FIRST_DISPLAY);
  const [stats, setStats] = useState<FlockStats>({ time: 0, count, fps: 0 });
  const [unsupported, setUnsupported] = useState(false);

  const actions = {
    choosePreset: (next: Preset) => {
      // The crows stay where they are, so you can see the same flock change when a rule is added
      setPreset(next);
      setParams(paramsFor(next));
    },
    toggleRunning: () => setRunning((value) => !value),
    step: () => {
      // Auto play while stepping one frame at a time is confusing, so stop it
      setRunning(false);
      sceneRef.current?.step();
    },
    toggleRotate: () => setAutoRotate((value) => !value),
    zoomIn: () => sceneRef.current?.zoom(1 / ZOOM_STEP),
    zoomOut: () => sceneRef.current?.zoom(ZOOM_STEP),
    restart: () => sceneRef.current?.load(createFlock(count, area, params)),
    /** Makes a new canvas with a new flock, for a new count or area */
    rebuild: (nextCount: number, nextArea: AreaChoice) => {
      setCount(nextCount);
      setAreaChoice(nextArea);
      setInitialFlock(createFlock(nextCount, nextArea.area, params));
    },
  };

  useKeyboardShortcuts({
    Space: actions.toggleRunning,
    ArrowRight: actions.step,
    KeyA: actions.toggleRotate,
    // The + key is Shift + = on most keyboards, so = also works
    Equal: actions.zoomIn,
    NumpadAdd: actions.zoomIn,
    Minus: actions.zoomOut,
    NumpadSubtract: actions.zoomOut,
    KeyR: actions.restart,
    // 1–4 pick a preset
    ...Object.fromEntries(
      GPU_PRESETS.map((item, i) => [`Digit${i + 1}`, () => actions.choosePreset(item)]),
    ),
  });

  return (
    <Workspace
      caption={
        <>
          <h2>{t(preset.name)}</h2>
          <p>
            {t({
              ja: '同じルールを GPU（WebGPU）で計算。1 羽に 1 つのスレッドが同時に動く',
              en: 'The same rules computed on the GPU (WebGPU), one thread per crow, all at once',
            })}
          </p>
        </>
      }
      panel={
        <ControlPanel
          presets={GPU_PRESETS}
          presetId={preset.id}
          running={running}
          autoRotate={autoRotate}
          timeScale={timeScale}
          counts={COUNTS}
          count={count}
          areas={AREAS}
          areaId={areaChoice.id}
          params={params}
          display={display}
          stats={stats}
          onPresetChange={(id) => actions.choosePreset(PRESETS.find((item) => item.id === id)!)}
          onToggleRunning={actions.toggleRunning}
          onStep={actions.step}
          onToggleRotate={actions.toggleRotate}
          onZoomIn={actions.zoomIn}
          onZoomOut={actions.zoomOut}
          onTimeScaleChange={setTimeScale}
          onCountChange={(next) => actions.rebuild(next, areaChoice)}
          onAreaChange={(id) =>
            actions.rebuild(
              count,
              AREAS.find((item) => item.id === id)!,
            )
          }
          onParamsChange={setParams}
          onRestart={actions.restart}
          onDisplayChange={setDisplay}
        />
      }
    >
      {/* A new count or area changes the GPU buffers and the camera, so change the key to make a new scene */}
      <BoidsCanvas
        key={`${count}-${areaChoice.id}`}
        ref={sceneRef}
        area={area}
        initialFlock={initialFlock}
        running={running}
        timeScale={timeScale}
        params={params}
        autoRotate={autoRotate}
        display={display}
        onStats={setStats}
        onUnsupported={() => setUnsupported(true)}
      />
      {unsupported && (
        <div className={styles.unsupported}>
          {t({
            ja: 'このブラウザでは WebGPU が使えません。最新の Chrome か Edge で開いてください',
            en: 'This browser cannot use WebGPU. Please open it in the latest Chrome or Edge',
          })}
        </div>
      )}
    </Workspace>
  );
}
