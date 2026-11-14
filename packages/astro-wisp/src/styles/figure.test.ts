import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./figure.css', import.meta.url), 'utf8');

describe('wide figure layout', () => {
  it('keeps wide content inside a desktop series rail', () => {
    expect(css).toContain('.wisp-has-toc:not(.wisp-has-series) .wisp-wide');
    expect(css).toMatch(
      /\.wisp-has-series \.wisp-wide\s*\{[\s\S]*?--wisp-wide-w: 100%;[\s\S]*?margin-inline: 0;/,
    );
  });
  it('centers wide prose content instead of inheriting figure margin', () => {
    expect(css).toMatch(
      /\.prose \.wisp-wide\s*\{[\s\S]*?margin-inline: calc\(\(100% - var\(--wisp-wide-w\)\) \/ 2\);/,
    );
  });
  it('floats diagram actions at top-right on hover-capable desktop and falls back below on touch/narrow', () => {
    expect(css).toContain('@media (min-width: 40rem) and (hover: hover) and (pointer: fine)');
    expect(css).toMatch(/\.wisp-diagram > \.wisp-fig-actions\s*\{[\s\S]*?position: absolute;/);
    expect(css).toMatch(
      /\.wisp-diagram:hover > \.wisp-fig-actions,\s*\.wisp-diagram:focus-within > \.wisp-fig-actions\s*\{[\s\S]*?opacity: 1;/,
    );
  });
  it('delegates Mermaid horizontal overflow cue to mask-image without legacy gradient scroll shadows', () => {
    expect(css).toContain('overscroll-behavior-x: contain');
    expect(css).not.toContain('no-repeat scroll');
  });
});
