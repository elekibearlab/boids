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

/**
 * Area sizes to choose from (world units). Lower than deep, because the sky is wide, not tall.
 * The crows keep their size, so in a bigger area they look smaller and the flock has more room
 */
const AREAS: AreaChoice[] = [
  { id: 's', name: { ja: '狭い', en: 'Small' }, area: { width: 120, height: 52, depth: 75 } },
  { id: 'm', name: { ja: 'ふつう', en: 'Medium' }, area: { width: 160, height: 70, depth: 100 } },
  { id: 'l', name: { ja: '広い', en: 'Large' }, area: { width: 240, height: 105, depth: 150 } },
  {
    id: 'xl',
    name: { ja: 'とても広い', en: 'Extra large' },
    area: { width: 320, height: 140, depth: 200 },
  },
];
const DEFAULT_AREA = AREAS[1];
/** Numbers of crows to choose from. More than 2D: the same flock spreads into one more direction */
const COUNTS = [100, 200, 400, 800, 1600];
const DEFAULT_COUNT = 400;
/** All helpers are off at first, so we start with only the crows on screen */
const NO_DISPLAY: Display = { range: false, follow: false, fog: false, sky: FIRST_SKY };
/** How much one press of zoom changes the camera distance */
const ZOOM_STEP = 1.25;

/** Default distances and limits, with the preset's weights */
const paramsFor = (preset: Preset): Params => ({ ...DEFAULT_PARAMS, ...preset.weights });

/**
 * The 3D flock screen. It keeps the rules, play state, camera and display in state, and builds the canvas and panel.
 */
export function Boids3D() {
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
  const [display, setDisplay] = useState(NO_DISPLAY);
  const [stats, setStats] = useState<FlockStats>({ time: 0, count });

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
    toggle: (key: 'range' | 'follow' | 'fog') => () =>
      setDisplay((value) => ({ ...value, [key]: !value[key] })),
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
    KeyV: actions.toggle('range'),
    KeyF: actions.toggle('follow'),
    // 1–6 pick a preset
    ...Object.fromEntries(
      PRESETS.map((item, i) => [`Digit${i + 1}`, () => actions.choosePreset(item)]),
    ),
  });

  return (
    <Workspace
      caption={
        <>
          <h2>{t(preset.name)}</h2>
          <p>
            {t(preset.description)}
            {preset.flee && t({ ja: ' · 茶色いのがタカ', en: ' · the brown bird is a hawk' })}
          </p>
        </>
      }
      panel={
        <ControlPanel
          presets={PRESETS}
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
      {/* A new count or area changes the crows to draw and the camera, so change the key to make a new scene */}
      <BoidsCanvas
        key={`${count}-${areaChoice.id}`}
        ref={sceneRef}
        area={area}
        initialFlock={initialFlock}
        running={running}
        timeScale={timeScale}
        params={params}
        flee={preset.flee}
        roost={preset.roost}
        autoRotate={autoRotate}
        display={display}
        onStats={setStats}
      />
    </Workspace>
  );
}
