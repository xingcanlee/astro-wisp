import { FONT_STACK_VARS } from './font-vars';
import { hueNamesOf, palette as defaultPalette, type Mode, type Palette } from './palette';

/**
 * palette → CSS 令牌。纯函数：默认调色板的产物提交在 src/styles/{tokens,pele,diagram}.css
 * （`pnpm tokens` 重新生成）；站点在 `wisp({ palette })` 中覆盖调色板时，集成在构建期调用同一组函数，
 * 产物写入 Astro 的 codegen 目录。
 */
export const HEADER =
  '/* 自动生成，勿手改。来源：design/palette.json，运行 `pnpm tokens` 重新生成。 */\n';

const q = (f: string) => (/[\s]/.test(f) ? `"${f}"` : f);
/** 由 Fonts API 提供的字体改为 `var(--font-wisp-*, 原族名)`（Fonts API 的族名带哈希）。 */
const stack = (fs: string[]) =>
  fs.map((f) => (FONT_STACK_VARS[f] ? `var(${FONT_STACK_VARS[f]}, ${q(f)})` : q(f))).join(', ');

/** Pele 的面积图 / 饼图填充：描边色混入背景，避免调色板重调后变成深色墨块。 */
export const PELE_FILL_STROKE_PERCENT = { light: 58, dark: 40 } as const;

function modeVars(p: Palette, mode: Mode): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(p.color.base)) lines.push(`  --wisp-${k}: ${v[mode]};`);
  for (const [k, v] of Object.entries(p.color.hue)) {
    lines.push(`  --wisp-hue-${k}: ${v.stroke[mode]};`);
    lines.push(`  --wisp-hue-${k}-fill: ${v.fill[mode]};`);
  }
  return lines.join('\n');
}

export function genTokens(p: Palette = defaultPalette): string {
  const { font, color } = p;
  const sem = Object.entries(color.semantic)
    .map(
      ([k, h]) =>
        `  --wisp-sem-${k}: var(--wisp-hue-${h});\n  --wisp-sem-${k}-fill: var(--wisp-hue-${h}-fill);`,
    )
    .join('\n');
  return `${HEADER}
:root,
[data-theme="light"] {
  color-scheme: light;
${modeVars(p, 'light')}
}

[data-theme="dark"] {
  color-scheme: dark;
${modeVars(p, 'dark')}
}

/* 语义色只写一次，自动随 hue 切换 */
:root {
${sem}
  --wisp-font-sans: ${stack(font.sans)};
  --wisp-font-mono: ${stack(font.mono)};
  --wisp-font-hand: ${stack(font.hand)};
}
`;
}

export function genPele(p: Palette = defaultPalette): string {
  const radiusValue = p.radius;
  const radius =
    radiusValue &&
    typeof radiusValue === 'object' &&
    'md' in radiusValue &&
    typeof radiusValue.md === 'number'
      ? radiusValue.md
      : 8;
  const hues = hueNamesOf(p);
  const series = hues
    .map(
      (h, i) =>
        `  --pele-series-${i + 1}: var(--wisp-hue-${h});\n` +
        `  --pele-series-${i + 1}-fill: color-mix(in srgb, var(--wisp-hue-${h}) ${PELE_FILL_STROKE_PERCENT.light}%, var(--wisp-bg));`,
    )
    .join('\n');
  const darkSeries = hues
    .map(
      (h, i) =>
        `  --pele-series-${i + 1}-fill: color-mix(in srgb, var(--wisp-hue-${h}) ${PELE_FILL_STROKE_PERCENT.dark}%, var(--wisp-bg));`,
    )
    .join('\n');
  const fills = hues
    .map(
      (_, i) =>
        `.pele-pie .pele-slice:nth-child(${i + 1}),\n` +
        `.pele-pie .pele-legend-item:nth-child(${i + 1}) rect,\n` +
        `.pele-xychart .pele-plot > .pele-series:nth-child(${i + 1}) .pele-area,\n` +
        `.pele-xychart .pele-plot > .pele-series:nth-child(${i + 1}).pele-bars {\n` +
        `  fill: var(--pele-series-${i + 1}-fill, var(--pele-series-${i + 1}));\n` +
        `}`,
    )
    .join('\n');
  return `${HEADER}
.pele {
  --pele-bg: transparent;
  --pele-fg: var(--wisp-fg);
  --pele-muted: var(--wisp-muted);
  --pele-line: var(--wisp-muted);
  --pele-surface: var(--wisp-surface);
  --pele-surface-alt: var(--wisp-surface-2);
  --pele-border: var(--wisp-border);
  --pele-accent: var(--wisp-accent);
  --pele-font: var(--wisp-font-sans);
  --pele-radius: ${radius}px;
${series}
}

[data-theme="dark"] .pele {
${darkSeries}
}

${fills}

.pele-pie .pele-slices,
.pele-pie .pele-slice {
  stroke: var(--wisp-bg);
  stroke-width: 1px;
}

.pele-pie .pele-slice-labels {
  fill: var(--wisp-fg);
}
`;
}

export function genDiagram(p: Palette = defaultPalette): string {
  const hues = hueNamesOf(p)
    .map((h) => `  --wd-${h}: var(--wisp-hue-${h});\n  --wd-${h}-fill: var(--wisp-hue-${h}-fill);`)
    .join('\n');
  return `${HEADER}
[data-theme] .wisp-d {
  --wd-bg: var(--wisp-bg);
  --wd-fg: var(--wisp-fg);
  --wd-muted: var(--wisp-muted);
  --wd-border: var(--wisp-border);
  --wd-surface: var(--wisp-surface);
${hues}
  --wd-font-sans: var(--wisp-font-sans);
  --wd-font-hand: var(--wisp-font-hand);
}
`;
}

/** 交互组件可用的色调名（TS 常量），让 `tone` 属性有类型提示。 */
export function genTones(p: Palette = defaultPalette): string {
  const sem = Object.keys(p.color.semantic);
  const hue = hueNamesOf(p);
  const list = (xs: string[]) => xs.map((x) => `'${x}'`).join(', ');
  return `/* 自动生成，勿手改。来源：design/palette.json，运行 \`pnpm tokens\` 重新生成。 */
export const SEMANTIC_TONES = [${list(sem)}] as const;
export const HUE_TONES = [${list(hue)}] as const;
`;
}

/** 三份 CSS 合成一份（站点覆盖调色板时写入 codegen 目录）。 */
export function genThemeCss(p: Palette): string {
  return [genTokens(p), genPele(p), genDiagram(p)].join('\n');
}
