import { useRef, useState } from 'react';
import { createFlock } from '@/core/boids2d';
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
 * Area sizes to choose from (world units). All 16:9, the same shape as the video.
 * The crows keep their size, so in a bigger area they look smaller and the flock has more room
 */
const AREAS: AreaChoice[] = [
  { id: 's', name: { ja: '狭い', en: 'Small' }, area: { width: 96, height: 54 } },
  { id: 'm', name: { ja: 'ふつう', en: 'Medium' }, area: { width: 128, height: 72 } },
  { id: 'l', name: { ja: '広い', en: 'Large' }, area: { width: 192, height: 108 } },
  { id: 'xl', name: { ja: 'とても広い', en: 'Extra large' }, area: { width: 256, height: 144 } },
];
const DEFAULT_AREA = AREAS[1];
/** Numbers of crows to choose from */
const COUNTS = [50, 100, 200, 400, 800];
const DEFAULT_COUNT = 100;
/** All helpers are off at first, so we start with only the crows on screen */
const NO_DISPLAY: Display = { range: false, sky: FIRST_SKY };

/** Default distances and limits, with the preset's weights */
const paramsFor = (preset: Preset): Params => ({ ...DEFAULT_PARAMS, ...preset.weights });

/**
 * The 2D flock screen. It keeps the rules, play state and display in state, and builds the canvas and panel.
 */
export function Boids2D() {
  const sceneRef = useRef<BoidsSceneHandle>(null);
  const [preset, setPreset] = useState(FIRST_PRESET);
  const [params, setParams] = useState(() => paramsFor(FIRST_PRESET));
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [areaChoice, setAreaChoice] = useState(DEFAULT_AREA);
  const area = areaChoice.area;
  // A new count or area makes a new canvas, so keep the first flock for it
  const [initialFlock, setInitialFlock] = useState(() => createFlock(count, area, params));
  const [running, setRunning] = useState(true);
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
    restart: () => sceneRef.current?.load(createFlock(count, area, params)),
    /** Makes a new canvas with a new flock, for a new count or area */
    rebuild: (nextCount: number, nextArea: AreaChoice) => {
      setCount(nextCount);
      setAreaChoice(nextArea);
      setInitialFlock(createFlock(nextCount, nextArea.area, params));
    },
    toggleRange: () => setDisplay((value) => ({ ...value, range: !value.range })),
  };

  useKeyboardShortcuts({
    Space: actions.toggleRunning,
    ArrowRight: actions.step,
    KeyR: actions.restart,
    KeyV: actions.toggleRange,
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
            {preset.flee && t({ ja: ' · カーソルが天敵', en: ' · the cursor is the predator' })}
          </p>
        </>
      }
      panel={
        <ControlPanel
          presets={PRESETS}
          presetId={preset.id}
          running={running}
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
      {/* A new count or area changes the sprites and the camera, so change the key to make a new scene */}
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
        display={display}
        onStats={setStats}
      />
    </Workspace>
  );
}
