import type { ReactNode } from 'react';

export interface StageProps {
  /** 内容尺寸（viewBox 单位） */
  width: number;
  height: number;
  /** 无障碍名称 */
  label: string;
  /** 四周留白，给描边留空间，默认 3 */
  pad?: number;
  /** 窄屏时的最小缩放比例（相对内容宽度），默认 0.72；更窄时横向滚动 */
  minScale?: number;
  /** 最大放大比例，默认 1.6 */
  maxScale?: number;
  children: ReactNode;
}

/** 讲解画面的 SVG 舞台：viewBox 自适应宽度、窄屏横向滚动、四周留白。 */
export default function Stage({ width, height, label, pad = 3, minScale = 0.72, maxScale = 1.6, children }: StageProps) {
  const vbW = width + 2 * pad;
  const vbH = height + 2 * pad;
  return (
    <div className="wisp-explainer__scroll">
      <svg
        className="wisp-explainer__svg"
        viewBox={`0 0 ${vbW} ${vbH}`}
        style={{ minWidth: vbW * minScale, maxWidth: vbW * maxScale }}
        role="group"
        aria-label={label}
      >
        <g transform={`translate(${pad} ${pad})`}>{children}</g>
      </svg>
    </div>
  );
}
