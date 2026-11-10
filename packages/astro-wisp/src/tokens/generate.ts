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
  const series = hueNamesOf(p)
    .map((h, i) => `  --pele-series-${i + 1}: var(--wisp-hue-${h});`)
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
