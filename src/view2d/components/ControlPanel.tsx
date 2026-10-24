import type { Params } from '@/core/params';
import type { Preset } from '@/data/presets';
import { Button, ButtonGrid, ButtonRow, Section, Select, Slider, Stats, Toggle } from '@/ui';
import { t } from '@/shared/i18n';
import { SKIES, type Sky } from '@/shared/sky';
import type { AreaChoice, Display, FlockStats } from '../types';

type Props = {
  presets: Preset[];
  presetId: string;
  running: boolean;
  /** Speed of time. 1 is real time */
  timeScale: number;
  counts: number[];
  /** Number of crows */
  count: number;
  areas: AreaChoice[];
  areaId: string;
  params: Params;
  display: Display;
  stats: FlockStats;
  onPresetChange: (id: string) => void;
  onToggleRunning: () => void;
  onStep: () => void;
  onTimeScaleChange: (timeScale: number) => void;
  onCountChange: (count: number) => void;
  onAreaChange: (id: string) => void;
  onParamsChange: (params: Params) => void;
  onRestart: () => void;
  onDisplayChange: (display: Display) => void;
};

/**
 * The control panel on the right. From the top: "Playback", "Rules", "Weights", "Flock", "Display".
 *
 * @param props.presets           Rule sets to choose from
 * @param props.presetId          Selected rule set
 * @param props.running           Whether it is playing
 * @param props.timeScale         Speed of time
 * @param props.counts            Numbers of crows to choose from
 * @param props.count             Current number of crows
 * @param props.areas             Area sizes to choose from
 * @param props.areaId            Current area size
 * @param props.params            Distances and weights
 * @param props.display           Helpers on/off
 * @param props.stats             Time and number of crows
 * @param props.onPresetChange    Changes the rule set
 * @param props.onToggleRunning   Plays or stops
 * @param props.onStep            Moves one frame
 * @param props.onTimeScaleChange Changes the speed of time
 * @param props.onCountChange     Changes the number of crows
 * @param props.onAreaChange      Changes the area size
 * @param props.onParamsChange    Changes a weight
 * @param props.onRestart         Starts again with a new random flock
 * @param props.onDisplayChange   Turns helpers on or off
 */
export function ControlPanel(props: Props) {
  const setParam = (key: keyof Params) => (value: number) =>
    props.onParamsChange({ ...props.params, [key]: value });

  return (
    <>
      <Section title={t({ ja: '再生', en: 'Playback' })}>
        <ButtonRow>
          <Button onClick={props.onToggleRunning} active={props.running} title="Space">
            {props.running ? t({ ja: '■ 停止', en: '■ Stop' }) : t({ ja: '▶ 再生', en: '▶ Play' })}
          </Button>
          <Button onClick={props.onStep} title="→">
            {t({ ja: '1コマ', en: 'Step' })}
          </Button>
        </ButtonRow>
        <Slider
          label={t({ ja: '速度', en: 'Speed' })}
          value={props.timeScale}
          min={0.25}
          max={2}
          step={0.25}
          format={(value) => `×${value}`}
          onChange={props.onTimeScaleChange}
        />
        <Stats {...props.stats} />
      </Section>

      <Section title={t({ ja: 'ルール', en: 'Rules' })}>
        <ButtonGrid>
          {props.presets.map((preset, i) => (
            <Button
              key={preset.id}
              onClick={() => props.onPresetChange(preset.id)}
              active={preset.id === props.presetId}
              title={String(i + 1)}
            >
              {t(preset.name)}
            </Button>
          ))}
        </ButtonGrid>
      </Section>

      <Section
        title={t({ ja: '強さ（0 でそのルールを切る）', en: 'Weights (0 turns a rule off)' })}
      >
        <Slider
          label={t({ ja: '分離', en: 'Separation' })}
          value={props.params.separationWeight}
          min={0}
          max={300}
          step={10}
          onChange={setParam('separationWeight')}
        />
        <Slider
          label={t({ ja: '整列', en: 'Alignment' })}
          value={props.params.alignmentWeight}
          min={0}
          max={6}
          step={0.5}
          onChange={setParam('alignmentWeight')}
        />
        <Slider
          label={t({ ja: '結合', en: 'Cohesion' })}
          value={props.params.cohesionWeight}
          min={0}
          max={4}
          step={0.25}
          onChange={setParam('cohesionWeight')}
        />
      </Section>

      <Section title={t({ ja: '群れ', en: 'Flock' })}>
        <Select
          label={t({ ja: '羽数', en: 'Crows' })}
          value={String(props.count)}
          onChange={(value) => props.onCountChange(Number(value))}
        >
          {props.counts.map((count) => (
            <option key={count} value={count}>
              {count.toLocaleString()}
            </option>
          ))}
        </Select>
        {/* A bigger area gives the flock more room. The crows stay the same size, so they look smaller */}
        <Select
          label={t({ ja: '範囲', en: 'Area' })}
          value={props.areaId}
          onChange={props.onAreaChange}
        >
          {props.areas.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {t(choice.name)} ({choice.area.width} × {choice.area.height})
            </option>
          ))}
        </Select>
        <ButtonRow>
          <Button onClick={props.onRestart} title="R">
            {t({ ja: 'ばらまき直す', en: 'Scatter again' })}
          </Button>
        </ButtonRow>
      </Section>

      <Section title={t({ ja: '表示（動きには影響しない）', en: 'Display (visual only)' })}>
        <Select
          label={t({ ja: '空', en: 'Sky' })}
          value={props.display.sky}
          onChange={(sky) => props.onDisplayChange({ ...props.display, sky: sky as Sky })}
        >
          {SKIES.map((sky) => (
            <option key={sky.id} value={sky.id}>
              {t(sky.name)}
            </option>
          ))}
        </Select>
        <Toggle
          label={t({ ja: '1 羽の見える範囲', en: 'What one crow sees' })}
          checked={props.display.range}
          onChange={(range) => props.onDisplayChange({ ...props.display, range })}
        />
      </Section>
    </>
  );
}
