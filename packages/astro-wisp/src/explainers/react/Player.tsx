import {
  memo,
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { Step } from '../core/timeline';
import { labelsFor, type PlayerLabels } from './labels';
import { SPEEDS, usePlayer, type PlayerApi } from './usePlayer';
import PlayerIcon from './PlayerIcon';
import { RichText } from './RichText';
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
  /** 外部的播放状态（`usePlayer(steps.length)`）；不传时 Player 自己管理。Explainer 用它把步数显示在标题行。 */
  player?: PlayerApi;
  /** 是否在控制条右侧显示步数「3 / 10」，默认 true（Explainer 有标题时步数在标题行，这里关掉） */
  count?: boolean;
}

/** 步数刻度：步数不多时每一步一个刻度，太密就只画连续的线。 */
export const MAX_TICKS = 24;

const isButton = (t: EventTarget) => t instanceof HTMLElement && t.tagName === 'BUTTON';
const isRange = (t: EventTarget) => t instanceof HTMLInputElement && t.type === 'range';

/**
 * 给会变化的短文字（步数、倍速）预留宽度：最宽的那一段通过 `data-reserve` 由 ::before 叠在同一个网格格子里
 * （不可见、不进文本内容），切换时周围不移动。数字用 tabular-nums，所以「最长」就是「最宽」。
 */
export function Reserve({ all, show }: { all: readonly string[]; show: string }) {
  const widest = [...all, show].reduce((a, b) => (b.length > a.length ? b : a));
  return (
    <span className="wisp-player__reserve" data-reserve={widest}>
      <span>{show}</span>
    </span>
  );
}

/** 步数「3 / 10」，按最宽的「10 / 10」预留宽度。 */
export function StepCount({ index, total }: { index: number; total: number }) {
  return (
    <span className="wisp-player__count" aria-hidden="true">
      <Reserve all={[`${total} / ${total}`]} show={`${index + 1} / ${total}`} />
    </span>
  );
}

/** 全部步骤的说明叠在同一格里（不可见、不朗读、不可交互），把说明区撑到最高那一步的高度。 */
// memo：steps 不变时（通常由 useMemo 生成）逐步播放不会重新渲染这 n 段隐藏说明
const CaptionGhosts = memo(function CaptionGhosts({ steps }: { steps: Step<unknown>[] }) {
  return (
    <div className="wisp-player__ghosts" aria-hidden="true" inert>
      {steps.map((s, i) => (
        <div key={i}>
          <RichText text={s.caption} />
        </div>
      ))}
    </div>
  );
});

/**
 * 舞台高度棘轮：记录当前宽度下见过的最大高度并设为 min-height，个别帧变矮时卡片不跳；宽度变化时重新计。
 * 直接写 style，不触发 React 渲染，也不做动画。
 */
function useStageRatchet(deps: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = -1;
    let max = 0;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].borderBoxSize?.[0];
      const w = box ? box.inlineSize : el.offsetWidth;
      if (w !== width) {
        width = w;
        el.style.minHeight = '';
        max = el.getBoundingClientRect().height;
        return;
      }
      const h = box ? box.blockSize : el.offsetHeight;
      if (h > max + 0.5) {
        max = h;
        el.style.minHeight = `${max}px`;
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      el.style.minHeight = '';
    };
  }, [deps]);
  return ref;
}

/**
 * 通用分步播放器：舞台 / 进度刻度 / 说明 / 控制条，键盘与 aria-live。
 * 任何 `Step<S>[]` 都可以交给它，画面由 children 渲染。说明里的 `$…$` 按行内公式排版。
 */
export default function Player<S>({
  steps,
  label,
  children,
  lang,
  labels,
  player,
  count = true,
}: PlayerProps<S>) {
  const own = usePlayer(steps.length);
  const p = player ?? own;
  const t = labelsFor(lang, labels);
  const n = steps.length;
  const step = steps[p.index];
  const atFirst = p.index <= 0;
  const atLast = p.index >= n - 1;
  const replay = !p.playing && atLast;
  const playLabel = p.playing ? t.pause : replay ? t.replay : t.play;
  const stageRef = useStageRatchet(steps);
  const progress = n > 1 ? p.index / (n - 1) : 1;
  const speedText = `${p.speed}×`;

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
      <div className="wisp-player__stage" ref={stageRef}>
        {children(step, p.index)}
      </div>

      <div
        className="wisp-player__track"
        style={{ '--wisp-progress': progress } as CSSProperties}
        data-ticks={n > 1 && n <= MAX_TICKS ? '' : undefined}
      >
        <div className="wisp-player__rail" aria-hidden="true">
          <span className="wisp-player__fill" />
          {n > 1 &&
            n <= MAX_TICKS &&
            steps.map((_, i) => (
              <span
                key={i}
                className="wisp-player__tick"
                data-done={i <= p.index ? '' : undefined}
                style={{ '--wisp-at': i / (n - 1) } as CSSProperties}
              />
            ))}
        </div>
        <input
          className="wisp-player__range"
          type="range"
          min={0}
          max={n - 1}
          step={1}
          value={p.index}
          aria-label={t.progress}
          aria-valuetext={t.stepOf(p.index + 1, n)}
          title={`${t.progress} (${t.keys.first} / ${t.keys.last})`}
          onChange={(e) => p.seek(Number(e.target.value))}
        />
      </div>

      <div className="wisp-player__captions">
        <div className="wisp-player__caption" aria-live="polite" aria-atomic="true">
          <RichText text={step.caption} />
        </div>
        <CaptionGhosts steps={steps} />
      </div>

      <div className="wisp-player__controls">
        <div className="wisp-player__buttons">
          <button
            type="button"
            aria-label={t.prev}
            title={`${t.prev} (${t.keys.prev})`}
            onClick={p.prev}
            disabled={atFirst}
          >
            <PlayerIcon name="prev" />
          </button>
          <button
            type="button"
            className="wisp-player__play"
            aria-label={playLabel}
            aria-description={p.reducedMotion ? t.reducedMotion : undefined}
            title={`${playLabel} (${t.keys.toggle})`}
            onClick={p.toggle}
          >
            <PlayerIcon name={p.playing ? 'pause' : replay ? 'replay' : 'play'} />
          </button>
          <button
            type="button"
            aria-label={t.next}
            title={`${t.next} (${t.keys.next})`}
            onClick={p.next}
            disabled={atLast}
          >
            <PlayerIcon name="next" />
          </button>
        </div>

        <div className="wisp-player__aside">
          {count && <StepCount index={p.index} total={n} />}
          <button
            type="button"
            className="wisp-player__speed"
            aria-label={t.speedCycle(p.speed)}
            title={t.speedCycle(p.speed)}
            onClick={p.cycleSpeed}
          >
            <Reserve all={SPEEDS.map((s) => `${s}×`)} show={speedText} />
          </button>
        </div>
      </div>
    </div>
  );
}
