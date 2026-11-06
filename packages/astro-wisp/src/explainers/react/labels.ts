import { lang as siteLang } from 'virtual:wisp/locale';

/** Player 的界面文字。站点语言为英文时自动用英文；也可以通过 `labels` 属性逐项覆盖。 */
export interface PlayerLabels {
  first: string;
  prev: string;
  next: string;
  last: string;
  play: string;
  pause: string;
  reducedMotion: string;
  progress: string;
  /** 进度的朗读文本 */
  stepOf: (index: number, total: number) => string;
  speed: string;
  speedValue: (s: number) => string;
  /** 键盘提示（title 中的括号部分） */
  keys: { first: string; prev: string; next: string; last: string; toggle: string };
}

export const ZH: PlayerLabels = {
  first: '第一步',
  prev: '上一步',
  next: '下一步',
  last: '最后一步',
  play: '播放',
  pause: '暂停',
  reducedMotion: '自动播放已关闭（系统设置为减少动态效果）',
  progress: '进度',
  stepOf: (i, n) => `第 ${i} 步，共 ${n} 步`,
  speed: '播放速度',
  speedValue: (s) => `${s} 倍速`,
  keys: { first: 'Home', prev: '←', next: '→', last: 'End', toggle: '空格' },
};

export const EN: PlayerLabels = {
  first: 'First step',
  prev: 'Previous step',
  next: 'Next step',
  last: 'Last step',
  play: 'Play',
  pause: 'Pause',
  reducedMotion: 'Autoplay is off (reduced motion is enabled)',
  progress: 'Progress',
  stepOf: (i, n) => `Step ${i} of ${n}`,
  speed: 'Playback speed',
  speedValue: (s) => `${s}× speed`,
  keys: { first: 'Home', prev: '←', next: '→', last: 'End', toggle: 'Space' },
};

/** 按 BCP 47 语言标签选择内置文字：zh* → 中文，其余 → 英文。缺省取站点语言（wisp 配置的 site.lang）。 */
export function labelsFor(lang: string = siteLang, overrides: Partial<PlayerLabels> = {}): PlayerLabels {
  const base = /^zh\b/i.test(lang) ? ZH : EN;
  return { ...base, ...overrides, keys: { ...base.keys, ...overrides.keys } };
}
