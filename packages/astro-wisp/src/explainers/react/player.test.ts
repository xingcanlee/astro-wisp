import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stepAt, type Step } from '../core/timeline';
import Explainer from './Explainer';
import Player from './Player';
import { harvestSsrTex, renderTex } from './RichText';
import { EN, ZH, labelsFor } from './labels';
import { SPEEDS, nextSpeed, stepDelay, type PlayerApi } from './usePlayer';

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
    { state: 1, caption: '第二步：令 $q = W^{Q} x$，再看' },
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
  it('公式在服务端就排好（KaTeX HTML），正文文字被转义，并输出 data-tex 与中文避头尾属性', () => {
    expect(html).toMatch(/class="katex"/);
    expect(html).toContain('data-tex="q = W^{Q} x" data-wisp-kinsoku=""');
    expect(html).toContain('data-tex="W^{UK}"');
    expect(html).not.toContain('data-tex="W^{UK}" data-wisp-kinsoku');
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
  it('没有第一步 / 最后一步按钮；第一步时上一步禁用且轨道标出 data-at-start', () => {
    expect(html).not.toContain('aria-label="第一步"');
    expect(html).not.toContain('aria-label="最后一步"');
    expect(html).toMatch(/aria-label="上一步"[^>]*disabled/);
    expect(html).toContain('class="wisp-player__track"');
    expect(html).toContain('data-at-start=""');
    expect(html).toContain('aria-label="播放速度：1 倍，按下切换"');
  });
  it('≤ 24 步时每步一个刻度', () => {
    expect(html.match(/wisp-player__tick/g)).toHaveLength(3);
  });
});

describe('stepAt 与步骤收缩边界保护', () => {
  const steps: Step<number>[] = [
    { state: 10, caption: '第一步' },
    { state: 20, caption: '第二步' },
  ];

  it('stepAt 对越界索引做夹紧，空数组抛错', () => {
    expect(stepAt(steps, -1)).toBe(steps[0]);
    expect(stepAt(steps, 10)).toBe(steps[1]);
    expect(() => stepAt([], 0)).toThrow(/空/);
  });

  it('steps 缩短且 player.index 越界时 Player 安全夹紧到最后一步而不崩溃', () => {
    const stalePlayer: PlayerApi = {
      index: 5,
      playing: false,
      speed: 1,
      reducedMotion: false,
      next: () => {},
      prev: () => {},
      first: () => {},
      last: () => {},
      seek: () => {},
      toggle: () => {},
      setSpeed: () => {},
      cycleSpeed: () => {},
    };
    const html = renderToString(
      createElement(Player<number>, {
        steps,
        label: '边界夹紧',
        player: stalePlayer,
        children: (s: Step<number>, idx: number) =>
          createElement('svg', { 'data-state': s.state, 'data-idx': idx }),
      }),
    );
    expect(html).toContain('data-state="20"');
    expect(html).toContain('data-idx="1"');
    expect(html).toContain('aria-valuetext="第 2 步，共 2 步"');
    expect(html).toContain('>第二步</div>');
  });
});

describe('RichText SSR data-tex 采集与缓存复用', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('harvestSsrTex 从 SSR DOM 采集已排好的 KaTeX HTML 并让 renderTex(null, tex) 直接命中缓存', () => {
    const cachedHtml = '<span class="katex"><span class="katex-html">H</span></span>';
    const fakeEls = [
      {
        dataset: { tex: 'H_{\\text{ssr}}' },
        innerHTML: cachedHtml,
        querySelector: (sel: string) => (sel === '.katex' ? {} : null),
      },
      {
        dataset: { tex: 'raw_{\\text{only}} <x>' },
        innerHTML: 'raw_{\\text{only}} &lt;x&gt;',
        querySelector: () => null,
      },
    ];
    vi.stubGlobal('document', {
      querySelectorAll: (sel: string) => (sel === '.wisp-tex[data-tex]' ? fakeEls : []),
    });

    harvestSsrTex();
    // 幂等：再次采集不应覆盖已有缓存
    fakeEls[0]!.innerHTML = 'mutated';
    harvestSsrTex();

    expect(renderTex(null, 'H_{\\text{ssr}}')).toBe(cachedHtml);
    expect(renderTex(null, 'raw_{\\text{only}} <x>')).toBe('raw_{\\text{only}} &#60;x&#62;');
  });

  it('客户端命中 SSR 缓存的公式渲染完整 KaTeX HTML 且不触发 loadKatex()', async () => {
    vi.resetModules();
    const originalSsr = import.meta.env.SSR;
    (import.meta.env as Record<string, unknown>).SSR = false;

    const katexRender = vi.fn((tex: string) => `<span class="katex">dyn:${tex}</span>`);
    const katexLoader = vi.fn(() => ({
      default: {
        renderToString: katexRender,
      },
    }));
    const effects: Array<() => void> = [];
    const appendedLinks: Array<{ rel: string; href: string }> = [];
    const cachedHtml = '<span class="katex"><span class="katex-html">SSR</span></span>';

    vi.doMock('katex', katexLoader);
    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react');
      return {
        ...actual,
        useEffect: (fn: () => void) => {
          effects.push(fn);
        },
        useSyncExternalStore: (_sub: () => () => void, getSnap: () => unknown) => getSnap(),
      };
    });
    let hasExistingKatexLink = false;
    vi.stubGlobal('document', {
      querySelectorAll: (sel: string) =>
        sel === '.wisp-tex[data-tex]'
          ? [
              {
                dataset: { tex: 'E = mc^2' },
                innerHTML: cachedHtml,
                querySelector: (s: string) => (s === '.katex' ? {} : null),
              },
            ]
          : [],
      querySelector: (sel: string) => (sel.includes('katex') && hasExistingKatexLink ? {} : null),
      createElement: () => ({ rel: '', href: '' }),
      head: {
        appendChild: (node: { rel: string; href: string }) => {
          appendedLinks.push(node);
          hasExistingKatexLink = true;
        },
      },
    });

    try {
      const { RichText } = await import('./RichText');
      const html = renderToString(createElement(RichText, { text: '公式 $E = mc^2$，完成' }));
      for (const run of effects) run();

      expect(html).toContain(cachedHtml);
      expect(html).toContain('data-tex="E = mc^2" data-wisp-kinsoku=""');
      expect(katexLoader).not.toHaveBeenCalled();
      expect(appendedLinks).toHaveLength(1);
      expect(appendedLinks[0]?.rel).toBe('stylesheet');

      // 页面已有 katex 样式表时不再重复插入 <link>
      effects.length = 0;
      renderToString(createElement(RichText, { text: '再次 $E = mc^2$' }));
      for (const run of effects) run();
      expect(appendedLinks).toHaveLength(1);
      expect(katexLoader).not.toHaveBeenCalled();

      // 遇到服务端未预渲染的新公式时才按需触发 loadKatex()
      effects.length = 0;
      renderToString(createElement(RichText, { text: '新公式 $Z_{\\text{new}}$' }));
      for (const run of effects) run();
      await vi.waitFor(() => {
        expect(katexLoader).toHaveBeenCalledTimes(1);
      });
      const afterLoadHtml = renderToString(
        createElement(RichText, { text: '新公式 $Z_{\\text{new}}$' }),
      );
      expect(katexRender).toHaveBeenCalledWith(
        'Z_{\\text{new}}',
        expect.objectContaining({ throwOnError: false }),
      );
      expect(afterLoadHtml).toContain('<span class="katex">dyn:Z_{\\text{new}}</span>');
    } finally {
      (import.meta.env as Record<string, unknown>).SSR = originalSsr;
      vi.doUnmock('katex');
      vi.doUnmock('react');
    }
  });
});
