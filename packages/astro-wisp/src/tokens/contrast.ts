import { wcagContrast } from 'culori';
import { hueNamesOf, palette as defaultPalette, type Mode, type Palette } from './palette';

export interface Row { mode: Mode; pair: string; ratio: number; pass: boolean }
export const MIN_CONTRAST = 4.5;

/** fg / muted / accent 与 8 个 hue stroke 在两种主题下与背景（及各自 fill）的对比度。 */
export function checkContrast(p: Palette = defaultPalette): Row[] {
  const rows: Row[] = [];
  for (const mode of ['light', 'dark'] as Mode[]) {
    const b = p.color.base;
    const bg = b.bg[mode];
    const add = (pair: string, a: string, c: string) => {
      const ratio = wcagContrast(a, c);
      rows.push({ mode, pair, ratio, pass: ratio >= MIN_CONTRAST });
    };
    for (const k of ['fg', 'muted', 'accent']) add(`${k} / bg`, b[k][mode], bg);
    for (const h of hueNamesOf(p)) {
      const { stroke, fill } = p.color.hue[h];
      add(`${h} stroke / bg`, stroke[mode], bg);
      add(`${h} stroke / ${h} fill`, stroke[mode], fill[mode]);
    }
  }
  return rows;
}
