/**
 * astro-wisp/explainers —— 交互式分步讲解（React island）。需要站点安装 @astrojs/react、react、react-dom、motion。
 *
 * 分层：core（纯 TS：Step 协议、record 录制器、格式化、色调）+ react（Explainer / Player / 原语）。
 * 具体讲解（矩阵乘、排序、注意力…）写在站点或文章目录里，组合这些积木即可。
 */
export * from './core';
export { default as Explainer, type ExplainerProps } from './react/Explainer';
export { default as Player, MAX_TICKS, type PlayerProps } from './react/Player';
export { RichText, Tex, loadKatex, type RichTextProps, type TexProps } from './react/RichText';
export {
  usePlayer,
  SPEEDS,
  BASE_INTERVAL_MS,
  stepDelay,
  nextSpeed,
  type PlayerApi,
  type Speed,
} from './react/usePlayer';
export { labelsFor, ZH, EN, type PlayerLabels } from './react/labels';
export { default as Stage, type StageProps } from './react/primitives/Stage';
export {
  default as Matrix,
  CELL,
  LABEL_H,
  matrixWidth,
  matrixHeight,
  type MatrixProps,
  type GridValue,
} from './react/primitives/Matrix';
export { default as Cell, type CellProps, type CellState } from './react/primitives/Cell';
export { default as Label, type LabelProps } from './react/primitives/Label';
export { default as TexLabel, type TexLabelProps } from './react/primitives/TexLabel';
