import type { ReactNode } from 'react';
import { plainInlineMath, splitFigureLabel } from '../core/math';
import type { Step } from '../core/timeline';
import type { PlayerLabels } from './labels';
import Player, { StepCount } from './Player';
import { RichText } from './RichText';
import { usePlayer } from './usePlayer';

export interface ExplainerProps<S> {
  /** 预先生成的全部步骤（通常来自 `(input) => Step<S>[]` 的纯函数或 `record()`） */
  steps: Step<S>[];
  /** 渲染一帧：只依赖 step.state / step.focus */
  children: (step: Step<S>, index: number) => ReactNode;
  /** 图注标题（可见）。开头的图号（`图 05-2a：`、`Figure 2:`）单独加粗；可以含 `$…$` 行内公式 */
  title?: string;
  /** 无障碍名称；缺省用 title */
  label?: string;
  /** 突破正文宽度（.wisp-wide），默认 true */
  wide?: boolean;
  lang?: string;
  labels?: Partial<PlayerLabels>;
}

/** 标题：图号（ink 600，与静态图共用 .wisp-fig-no）+ 其余文字（muted）。 */
function Title({ title }: { title: string }) {
  const { label, rest } = splitFigureLabel(title);
  if (!label)
    return (
      <span className="wisp-explainer__title-text">
        <RichText text={title} />
      </span>
    );
  return (
    <span className="wisp-explainer__title-text" data-numbered="">
      <span className="wisp-fig-no">{label}</span>
      <RichText text={rest} />
    </span>
  );
}

/**
 * 讲解组件的外壳：一张卡片 `<figure>`，可选标题行（标题 + 步数）+ Player。
 * 具体讲解（矩阵乘、排序、注意力…）只需提供步骤和每帧的画面。
 *
 * ```tsx
 * export default function BubbleSort({ input }: { input: number[] }) {
 *   const steps = useMemo(() => bubbleSort(input), [input]);
 *   return <Explainer title="冒泡排序" steps={steps}>{(s) => <Scene state={s.state} focus={s.focus} />}</Explainer>;
 * }
 * ```
 */
export default function Explainer<S>({
  steps,
  children,
  title,
  label,
  wide = true,
  lang,
  labels,
}: ExplainerProps<S>) {
  const player = usePlayer(steps.length);
  return (
    <figure className={wide ? 'wisp-wide wisp-explainer' : 'wisp-explainer'}>
      {title && (
        <figcaption className="wisp-explainer__title">
          <Title title={title} />
          <StepCount index={player.index} total={steps.length} />
        </figcaption>
      )}
      <Player
        steps={steps}
        label={label ?? (title ? plainInlineMath(title) : 'Explainer')}
        lang={lang}
        labels={labels}
        player={player}
        count={!title}
      >
        {children}
      </Player>
    </figure>
  );
}
