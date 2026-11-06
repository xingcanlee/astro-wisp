import { motion, useReducedMotion } from 'motion/react';
import { toneFill, toneStroke, type Tone } from '../../core/tones';

export type CellState = 'none' | 'soft' | 'strong';

export interface CellProps {
  x: number;
  y: number;
  size: number;
  text: string;
  /** 色调：语义色（q / k / v / visited …）或 hue（blue / amber …） */
  tone: Tone;
  state?: CellState;
  /** 值尚未产生（如未写回的结果） */
  empty?: boolean;
}

/** 单个格子。高亮用叠加层的透明度做 150ms 过渡（Motion）；reduced-motion 下直接切换。 */
export default function Cell({ x, y, size, text, tone, state = 'none', empty = false }: CellProps) {
  const reduce = useReducedMotion();
  const transition = { duration: reduce ? 0 : 0.15, ease: 'easeOut' as const };
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={4} style={{ fill: toneFill(tone), stroke: toneStroke(tone), strokeWidth: 1.25 }} />
      <motion.rect
        x={x} y={y} width={size} height={size} rx={4}
        initial={false}
        animate={{ opacity: state === 'soft' ? 1 : 0 }}
        transition={transition}
        style={{ fill: toneStroke(tone), fillOpacity: 0.2 }}
      />
      <motion.rect
        x={x} y={y} width={size} height={size} rx={4}
        initial={false}
        animate={{ opacity: state === 'strong' ? 1 : 0 }}
        transition={transition}
        style={{ fill: toneFill('highlight'), stroke: toneStroke('highlight'), strokeWidth: 2.5 }}
      />
      <text
        x={x + size / 2} y={y + size / 2}
        textAnchor="middle" dominantBaseline="central"
        className="wisp-explainer__cell-text"
        style={{ fill: empty ? 'var(--wisp-muted)' : 'var(--wisp-fg)' }}
      >
        {text}
      </text>
    </g>
  );
}
