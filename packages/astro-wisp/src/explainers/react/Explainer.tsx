import type { ReactNode } from 'react';
import type { Step } from '../core/timeline';
import type { PlayerLabels } from './labels';
import Player from './Player';

export interface ExplainerProps<S> {
  /** 预先生成的全部步骤（通常来自 `(input) => Step<S>[]` 的纯函数或 `record()`） */
  steps: Step<S>[];
  /** 渲染一帧：只依赖 step.state / step.focus */
  children: (step: Step<S>, index: number) => ReactNode;
  /** 图注标题（可见） */
  title?: string;
  /** 无障碍名称；缺省用 title */
  label?: string;
  /** 突破正文宽度（.wisp-wide），默认 true */
  wide?: boolean;
  lang?: string;
  labels?: Partial<PlayerLabels>;
}

/**
 * 讲解组件的外壳：`<figure>` + 可选标题 + Player。具体讲解（矩阵乘、排序、注意力…）只需提供步骤和每帧的画面。
 *
 * ```tsx
 * export default function BubbleSort({ input }: { input: number[] }) {
 *   const steps = useMemo(() => bubbleSort(input), [input]);
 *   return <Explainer title="冒泡排序" steps={steps}>{(s) => <Scene state={s.state} focus={s.focus} />}</Explainer>;
 * }
 * ```
 */
export default function Explainer<S>({ steps, children, title, label, wide = true, lang, labels }: ExplainerProps<S>) {
  return (
    <figure className={wide ? 'wisp-wide wisp-explainer' : 'wisp-explainer'}>
      {title && <figcaption className="wisp-explainer__title">{title}</figcaption>}
      <Player steps={steps} label={label ?? title ?? 'Explainer'} lang={lang} labels={labels}>
        {children}
      </Player>
    </figure>
  );
}
