import type { Params } from '@/core/params';
import type { LocalizedText } from '@/shared/i18n';

/**
 * A named set of rules. 2D and 3D use the same list.
 * They go in the order you would explain them: one rule at a time, then all three, then the extras.
 */
export type Preset = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Weight of each rule. 0 turns the rule off */
  weights: Pick<Params, 'separationWeight' | 'alignmentWeight' | 'cohesionWeight'>;
  /** Crows fly away from a threat (2D: the cursor, 3D: a hawk) */
  flee: boolean;
  /** Crows circle over their roost */
  roost: boolean;
};

/** The three rules at the default weights */
const ALL_RULES = {
  separationWeight: 120,
  alignmentWeight: 2,
  cohesionWeight: 1,
} satisfies Preset['weights'];

export const PRESETS: Preset[] = [
  {
    id: 'separation',
    name: { ja: '分離だけ', en: 'Separation only' },
    description: {
      ja: '近すぎる仲間から離れるだけ。ぶつからないが、群れにはならない',
      en: 'Only move away from crows that are too close. No crashes, but no flock either',
    },
    weights: { separationWeight: 120, alignmentWeight: 0, cohesionWeight: 0 },
    flee: false,
    roost: false,
  },
  {
    id: 'alignment',
    name: { ja: '整列だけ', en: 'Alignment only' },
    description: {
      ja: '近くの仲間と同じ向きに飛ぶだけ。向きはそろうが、重なってしまう',
      en: 'Only fly the same way as crows nearby. They line up, but pile on top of each other',
    },
    weights: { separationWeight: 0, alignmentWeight: 2, cohesionWeight: 0 },
    flee: false,
    roost: false,
  },
  {
    id: 'cohesion',
    name: { ja: '結合だけ', en: 'Cohesion only' },
    description: {
      ja: '近くの仲間の真ん中へ向かうだけ。集まるが、向きはばらばら',
      en: 'Only move toward the center of crows nearby. They gather, but face every way',
    },
    weights: { separationWeight: 0, alignmentWeight: 0, cohesionWeight: 1 },
    flee: false,
    roost: false,
  },
  {
    id: 'boids',
    name: { ja: '3 つ全部', en: 'All three' },
    description: {
      ja: '分離・整列・結合を足すと、群れになって飛ぶ',
      en: 'Separation, alignment and cohesion together make a flock',
    },
    weights: ALL_RULES,
    flee: false,
    roost: false,
  },
  {
    id: 'flee',
    name: { ja: '＋ 天敵から逃げる', en: '+ Flee' },
    description: {
      ja: '天敵から逃げる力を足す。群れが割れて、また合流する',
      en: 'Add a force away from a predator. The flock splits, then joins up again',
    },
    weights: ALL_RULES,
    flee: true,
    roost: false,
  },
  {
    id: 'roost',
    name: { ja: '＋ ねぐらを回る', en: '+ Roost' },
    description: {
      ja: 'ねぐらへ向かう力と、その横へ回る力を足す。夕方のカラスのように渦を巻く',
      en: 'Add a pull to the roost and a turn around it. They swirl like crows at dusk',
    },
    weights: ALL_RULES,
    flee: false,
    roost: true,
  },
];

/** Shown first: all three rules, so the first look is a flock */
export const FIRST_PRESET = PRESETS.find((item) => item.id === 'boids')!;
