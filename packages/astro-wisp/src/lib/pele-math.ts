import { createRequire } from 'node:module';
import type { MathMarkup, MathResolver } from 'pele';
import type { LiteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element.js';
import type { MathDocument } from 'mathjax-full/js/core/MathDocument.js';
import type { LiteDocument } from 'mathjax-full/js/adaptors/lite/Document.js';
import type { LiteText } from 'mathjax-full/js/adaptors/lite/Text.js';

const SAFE_TEX_PACKAGES = [
  'base',
  'ams',
  'boldsymbol',
  'braket',
  'cancel',
  'cases',
  'mathtools',
  'newcommand',
  'textmacros',
  'upgreek',
] as const;

const SAFE_TEX_CONFIG_MODULES = [
  'mathjax-full/js/input/tex/base/BaseConfiguration.js',
  'mathjax-full/js/input/tex/ams/AmsConfiguration.js',
  'mathjax-full/js/input/tex/boldsymbol/BoldsymbolConfiguration.js',
  'mathjax-full/js/input/tex/braket/BraketConfiguration.js',
  'mathjax-full/js/input/tex/cancel/CancelConfiguration.js',
  'mathjax-full/js/input/tex/cases/CasesConfiguration.js',
  'mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js',
  'mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js',
  'mathjax-full/js/input/tex/textmacros/TextMacrosConfiguration.js',
  'mathjax-full/js/input/tex/upgreek/UpgreekConfiguration.js',
] as const;

const MAX_CACHE_ENTRIES = 2000;

interface MathJaxEngine {
  adaptor: LiteAdaptor;
  doc: MathDocument<LiteElement, LiteText, LiteDocument>;
}

let engine: MathJaxEngine | undefined;
const cache = new Map<string, MathMarkup | null>();

function getEngine(): MathJaxEngine {
  if (engine) return engine;

  const req = createRequire(import.meta.url);
  const { mathjax } = req(
    'mathjax-full/js/mathjax.js',
  ) as typeof import('mathjax-full/js/mathjax.js');
  const { TeX } = req(
    'mathjax-full/js/input/tex.js',
  ) as typeof import('mathjax-full/js/input/tex.js');
  const { SVG } = req(
    'mathjax-full/js/output/svg.js',
  ) as typeof import('mathjax-full/js/output/svg.js');
  const { liteAdaptor } = req(
    'mathjax-full/js/adaptors/liteAdaptor.js',
  ) as typeof import('mathjax-full/js/adaptors/liteAdaptor.js');
  const { RegisterHTMLHandler } = req(
    'mathjax-full/js/handlers/html.js',
  ) as typeof import('mathjax-full/js/handlers/html.js');

  for (const mod of SAFE_TEX_CONFIG_MODULES) {
    req(mod);
  }

  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);

  const texInput = new TeX<LiteElement, LiteText, LiteDocument>({
    packages: [...SAFE_TEX_PACKAGES],
  });
  // fontCache: 'none' 内联所有字形 <path>，避免 <defs>/<use> 在多图、Lightbox 克隆或 RSS 中失效
  const svgOutput = new SVG<LiteElement, LiteText, LiteDocument>({
    fontCache: 'none',
  });
  const doc = mathjax.document('', {
    InputJax: texInput,
    OutputJax: svgOutput,
  });

  engine = { adaptor, doc };
  return engine;
}

/** 把 MathJax 的 ex 单位尺寸换算为像素（MathJax 约定 1ex = size / 2）。 */
function parseExToPx(raw: unknown, size: number): number | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number.parseFloat(trimmed);
  if (!Number.isFinite(num) || num <= 0) return null;
  const px = trimmed.endsWith('ex') ? num * (size / 2) : num;
  return Number.isFinite(px) && px > 0 ? Number(px.toFixed(2)) : null;
}

function setCached(key: string, value: MathMarkup | null): void {
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

export interface PeleMathOptions {
  /** 是否使用独立块级公式样式。默认 false（节点/边标签多与文字混排，紧凑行内排版更协调）。 */
  display?: boolean;
}

/**
 * 创建面向 Pele 的构建期同步 MathResolver（基于 MathJax SVG）。
 * 惰性初始化：仅当图表实际包含 `$$...$$` 时才加载 MathJax，并按 `(display, size, tex)` 缓存结果。
 */
export function createPeleMathResolver(options: PeleMathOptions = {}): MathResolver {
  const display = options.display ?? false;

  return (tex: string, size: number): MathMarkup | null => {
    const source = tex.trim();
    if (!source || !Number.isFinite(size) || size <= 0) return null;

    const cacheKey = `${display ? 1 : 0}\0${size}\0${source}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey) ?? null;
    }

    let result: MathMarkup | null = null;
    try {
      const { adaptor, doc } = getEngine();
      const ex = size / 2;
      const container = doc.convert(source, { display, em: size, ex }) as LiteElement;
      const svgEl = adaptor.tags(container, 'svg')[0];
      if (svgEl) {
        const rawHtml = adaptor.outerHTML(svgEl);
        if (!rawHtml.includes('data-mjx-error') && !rawHtml.includes('data-mml-node="merror"')) {
          const width = parseExToPx(adaptor.getAttribute(svgEl, 'width'), size);
          const height = parseExToPx(adaptor.getAttribute(svgEl, 'height'), size);
          if (width !== null && height !== null) {
            adaptor.setAttribute(svgEl, 'width', String(width));
            adaptor.setAttribute(svgEl, 'height', String(height));
            adaptor.removeAttribute(svgEl, 'style');
            // 外层 .wisp-pele-body 已有 role="img"，内嵌 MathJax SVG 需隐藏以免 axe svg-img-alt 误报
            adaptor.removeAttribute(svgEl, 'role');
            adaptor.removeAttribute(svgEl, 'focusable');
            adaptor.setAttribute(svgEl, 'aria-hidden', 'true');
            result = { svg: adaptor.outerHTML(svgEl), width, height };
          }
        }
      }
    } catch {
      result = null;
    }

    setCached(cacheKey, result);
    return result;
  };
}

/** 默认的 Pele 公式解析器（行内紧凑排版）。 */
export const peleMath: MathResolver = createPeleMathResolver();
