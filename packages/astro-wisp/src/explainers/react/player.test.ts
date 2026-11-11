import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Step } from '../core/timeline';
import Explainer from './Explainer';
import { EN, ZH, labelsFor } from './labels';
import { SPEEDS, nextSpeed, stepDelay } from './usePlayer';

describe('labels', () => {
  it('按语言选择内置文字', () => {
    expect(labelsFor('zh-CN').play).toBe(ZH.play);
    expect(labelsFor('en').play).toBe(EN.play);
    expect(labelsFor('fr').replay).toBe('Replay');
  });
  it('逐项覆盖，键位提示单独合并', () => {
    const t = labelsFor('en', { play: 'Go', keys: { toggle: 'K' } as never });
    expect(t.play).toBe('Go');
    expect(t.keys.toggle).toBe('K');
    expect(t.keys.next).toBe(EN.keys.next);
  });
  it('倍速按钮的无障碍名称包含当前倍速和操作', () => {
    expect(ZH.speedCycle(0.5)).toMatch(/0\.5.*切换/);
    expect(EN.speedCycle(2)).toMatch(/2×.*change/);
  });
});

describe('speed', () => {
  it('0.5× → 1× → 2× → 0.5× 循环', () => {
    expect(SPEEDS.map(nextSpeed)).toEqual([1, 2, 0.5]);
    let s: (typeof SPEEDS)[number] = 1;
    for (let i = 0; i < SPEEDS.length; i++) s = nextSpeed(s);
    expect(s).toBe(1);
  });
  it('stepDelay 与倍速成反比', () => {
    expect(stepDelay(2)).toBe(stepDelay(1) / 2);
  });
});

describe('Explainer 服务端渲染', () => {
  const steps: Step<number>[] = [
    { state: 0, caption: '短' },
    { state: 1, caption: '第二步：令 $q = W^{Q} x$' },
    { state: 2, caption: '价格 \\$5 <b>不是标签</b>' },
  ];
  const html = renderToString(
    createElement(Explainer<number>, {
      steps,
      title: '图 05-2a：$W^{UK}$ 的吸收',
      lang: 'zh-CN',
      children: (s: Step<number>) => createElement('svg', { 'data-state': s.state }),
    }),
  );

  it('标题：图号单独一段，步数在标题行，控制条里不重复', () => {
    expect(html).toContain('<span class="wisp-fig-no">图 05-2a</span>');
    expect(html.match(/wisp-player__count/g)).toHaveLength(1);
    expect(html).toContain('data-reserve="3 / 3"');
  });
  it('公式在服务端就排好（KaTeX HTML），正文文字被转义', () => {
    expect(html).toMatch(/class="katex"/);
    expect(html).not.toContain('<b>不是标签</b>');
    expect(html).toContain('价格 $5');
  });
  it('全部说明都渲染在不朗读的预留层里，aria-live 区只有当前一步', () => {
    const live = /<div class="wisp-player__caption" aria-live="polite"[^>]*>(.*?)<\/div>/.exec(
      html,
    );
    expect(live?.[1]).toBe('短');
    expect(html).toMatch(/class="wisp-player__ghosts" aria-hidden="true" inert=""/);
    expect(html).toContain('W^{Q} x');
  });
  it('没有第一步 / 最后一步按钮；第一步时上一步禁用', () => {
    expect(html).not.toContain('aria-label="第一步"');
    expect(html).not.toContain('aria-label="最后一步"');
    expect(html).toMatch(/aria-label="上一步"[^>]*disabled/);
    expect(html).toContain('aria-label="播放速度：1 倍，按下切换"');
  });
  it('≤ 24 步时每步一个刻度', () => {
    expect(html.match(/wisp-player__tick/g)).toHaveLength(3);
  });
});
