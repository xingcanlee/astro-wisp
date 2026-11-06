import { describe, expect, it } from 'vitest';
import { clampIndex, focusOf, itemId, record, cellId } from './timeline';
import { toneFill, toneStroke } from './tones';

describe('timeline', () => {
  it('clampIndex', () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(9, 3)).toBe(2);
    expect(clampIndex(1.7, 3)).toBe(1);
    expect(clampIndex(Number.NaN, 3)).toBe(0);
    expect(clampIndex(2, 0)).toBe(0);
  });
  it('record 每次 emit 保存独立快照', () => {
    const steps = record({ arr: [3, 1, 2] }, (s, emit) => {
      emit('初始');
      [s.arr[0], s.arr[1]] = [s.arr[1], s.arr[0]];
      emit('交换', [itemId('arr', 0), itemId('arr', 1)]);
    });
    expect(steps.map((x) => x.state.arr)).toEqual([[3, 1, 2], [1, 3, 2]]);
    expect(steps[0]).not.toHaveProperty('focus');
    expect(steps[1].focus).toEqual(['arr:0', 'arr:1']);
  });
  it('record 不修改输入，且至少要有一步', () => {
    const input = { n: 1 };
    record(input, (s, emit) => { s.n = 2; emit('x'); });
    expect(input.n).toBe(1);
    expect(() => record(input, () => {})).toThrow(/至少/);
  });
  it('focusOf 按前缀取键', () => {
    expect([...focusOf([cellId('a', 1, 0), cellId('b', 0, 0), 'ab:1'], 'a')]).toEqual(['1,0']);
    expect(focusOf(undefined, 'a').size).toBe(0);
  });
});

describe('tones', () => {
  it('语义色与 hue 分别映射到各自的令牌', () => {
    expect(toneStroke('q')).toBe('var(--wisp-sem-q)');
    expect(toneFill('visited')).toBe('var(--wisp-sem-visited-fill)');
    expect(toneStroke('blue')).toBe('var(--wisp-hue-blue)');
    expect(toneFill('slate')).toBe('var(--wisp-hue-slate-fill)');
  });
});
