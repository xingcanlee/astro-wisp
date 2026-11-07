import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./figure.css', import.meta.url), 'utf8');

describe('wide figure layout', () => {
  it('keeps wide content inside a desktop series rail', () => {
    expect(css).toContain('.wisp-has-toc:not(.wisp-has-series) .wisp-wide');
    expect(css).toMatch(/\.wisp-has-series \.wisp-wide\s*\{[\s\S]*?--wisp-wide-w: 100%;[\s\S]*?margin-inline: 0;/);
  });
});
