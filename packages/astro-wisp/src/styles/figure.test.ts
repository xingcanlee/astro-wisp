import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./figure.css', import.meta.url), 'utf8');

describe('wide figure layout', () => {
  it('keeps wide content inside a desktop series rail', () => {
    expect(css).toContain('.wisp-has-toc:not(.wisp-has-series) .wisp-wide');
    expect(css).toMatch(/\.wisp-has-series \.wisp-wide\s*\{[\s\S]*?--wisp-wide-w: 100%;[\s\S]*?margin-inline: 0;/);
  });
  it('centers wide prose content instead of inheriting figure margin', () => {
    expect(css).toMatch(/\.prose \.wisp-wide\s*\{[\s\S]*?margin-inline: calc\(\(100% - var\(--wisp-wide-w\)\) \/ 2\);/);
  });
});
