import { lang as siteLang } from 'virtual:wisp/locale';

/** Player 的界面文字。站点语言为英文时自动用英文；也可以通过 `labels` 属性逐项覆盖。 */
export interface PlayerLabels {
  first: string;
  prev: string;
  next: string;
  last: string;
  play: string;
  pause: string;
  replay: string;
  reducedMotion: string;
  progress: string;
  /** 进度的朗读文本 */
  stepOf: (index: number, total: number) => string;
  speed: string;
  speedValue: (s: number) => string;
  /** 倍速按钮的无障碍名称：当前倍速 + 按下会切换 */
  speedCycle: (s: number) => string;
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
  replay: '重新播放',
  reducedMotion: '系统已减少过渡动画；手动播放仍可用',
  progress: '进度',
  stepOf: (i, n) => `第 ${i} 步，共 ${n} 步`,
  speed: '播放速度',
  speedValue: (s) => `${s} 倍速`,
  speedCycle: (s) => `播放速度：${s} 倍，按下切换`,
  keys: { first: 'Home', prev: '←', next: '→', last: 'End', toggle: '空格' },
};

export const EN: PlayerLabels = {
  first: 'First step',
  prev: 'Previous step',
  next: 'Next step',
  last: 'Last step',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  reducedMotion: 'Transitions are reduced; manual playback is still available',
  progress: 'Progress',
  stepOf: (i, n) => `Step ${i} of ${n}`,
  speed: 'Playback speed',
  speedValue: (s) => `${s}× speed`,
  speedCycle: (s) => `Playback speed ${s}×, activate to change`,
  keys: { first: 'Home', prev: '←', next: '→', last: 'End', toggle: 'Space' },
};

/** 按 BCP 47 语言标签选择内置文字：zh* → 中文，其余 → 英文。缺省取站点语言（wisp 配置的 site.lang）。 */
export function labelsFor(
  lang: string = siteLang,
  overrides: Partial<PlayerLabels> = {},
): PlayerLabels {
  const base = /^zh\b/i.test(lang) ? ZH : EN;
  return { ...base, ...overrides, keys: { ...base.keys, ...overrides.keys } };
}
