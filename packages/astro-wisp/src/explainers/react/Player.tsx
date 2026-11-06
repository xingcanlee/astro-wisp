import type { KeyboardEvent, ReactNode } from 'react';
import type { Step } from '../core/timeline';
import { labelsFor, type PlayerLabels } from './labels';
import { SPEEDS, usePlayer } from './usePlayer';
import '../explainers.css';

export interface PlayerProps<S> {
  steps: Step<S>[];
  /** 容器的无障碍名称 */
  label: string;
  /** 渲染当前步骤；没有内部状态 */
  children: (step: Step<S>, index: number) => ReactNode;
  /** 界面语言（BCP 47），默认站点语言 */
  lang?: string;
  /** 逐项覆盖界面文字 */
  labels?: Partial<PlayerLabels>;
}

const isButton = (t: EventTarget) => t instanceof HTMLElement && t.tagName === 'BUTTON';
const isRange = (t: EventTarget) => t instanceof HTMLInputElement && t.type === 'range';

/**
 * 通用分步播放器：播放 / 暂停 / 单步 / 进度 / 速度 / 键盘 / aria-live。
 * 任何 `Step<S>[]` 都可以交给它，画面由 children 渲染。
 */
export default function Player<S>({ steps, label, children, lang, labels }: PlayerProps<S>) {
  const p = usePlayer(steps.length);
  const t = labelsFor(lang, labels);
  const step = steps[p.index];
  const atFirst = p.index <= 0;
  const atLast = p.index >= steps.length - 1;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case ' ':
        if (isButton(e.target) || isRange(e.target)) return; // 交给按钮自身
        p.toggle();
        break;
      case 'ArrowRight':
        if (isRange(e.target)) return;
        p.next();
        break;
      case 'ArrowLeft':
        if (isRange(e.target)) return;
        p.prev();
        break;
      case 'Home':
        if (isRange(e.target)) return;
        p.first();
        break;
      case 'End':
        if (isRange(e.target)) return;
        p.last();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div className="wisp-player" role="group" aria-label={label} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="wisp-player__stage">{children(step, p.index)}</div>

      <div className="wisp-player__caption" aria-live="polite" aria-atomic="true">
        {step.caption}
      </div>

      <div className="wisp-player__controls">
        <div className="wisp-player__buttons">
          <button type="button" aria-label={t.first} title={`${t.first} (${t.keys.first})`} onClick={p.first} disabled={atFirst}>⏮</button>
          <button type="button" aria-label={t.prev} title={`${t.prev} (${t.keys.prev})`} onClick={p.prev} disabled={atFirst}>◀</button>
          <button
            type="button"
            className="wisp-player__play"
            aria-label={p.reducedMotion ? t.reducedMotion : p.playing ? t.pause : t.play}
            title={`${p.playing ? t.pause : t.play} (${t.keys.toggle})`}
            onClick={p.toggle}
            disabled={p.reducedMotion}
          >
            {p.playing ? '⏸' : '▶'}
          </button>
          <button type="button" aria-label={t.next} title={`${t.next} (${t.keys.next})`} onClick={p.next} disabled={atLast}>▶</button>
          <button type="button" aria-label={t.last} title={`${t.last} (${t.keys.last})`} onClick={p.last} disabled={atLast}>⏭</button>
        </div>

        <input
          className="wisp-player__range"
          type="range"
          min={0}
          max={steps.length - 1}
          step={1}
          value={p.index}
          aria-label={t.progress}
          aria-valuetext={t.stepOf(p.index + 1, steps.length)}
          onChange={(e) => p.seek(Number(e.target.value))}
        />
        <span className="wisp-player__count" aria-hidden="true">
          {p.index + 1} / {steps.length}
        </span>

        <div className="wisp-player__speed" role="group" aria-label={t.speed}>
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={p.speed === s} aria-label={t.speedValue(s)} onClick={() => p.setSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
