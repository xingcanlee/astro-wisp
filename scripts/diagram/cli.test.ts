import { describe, expect, it, vi } from 'vitest';
import { main, parseArgs } from './cli.ts';

describe('parseArgs', () => {
  it('区分位置参数、布尔开关和带值选项', () => {
    const f = parseArgs(['a.drawio', '--force', '--drawio', 'browser', '--theme', 'dark', 'b.excalidraw', '-o', 'x.png']);
    expect(f.positional).toEqual(['a.drawio', 'b.excalidraw']);
    expect(f.flags.get('--force')).toBe(true);
    expect(f.flags.get('--drawio')).toBe('browser');
    expect(f.flags.get('--theme')).toBe('dark');
    expect(f.flags.get('-o')).toBe('x.png');
  });
});

describe('main', () => {
  it('help 返回 0，无命令返回 2，未知命令返回 2', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      expect(await main(['help'])).toBe(0);
      expect(await main([])).toBe(2);
      expect(await main(['nope'])).toBe(2);
      expect(String(err.mock.calls.at(-1)?.[0])).toMatch(/未知命令/);
      expect(await main(['export', '--theme', 'sepia', 'a.svg'])).toBe(2);
    } finally {
      out.mockRestore();
      err.mockRestore();
    }
  });
});
