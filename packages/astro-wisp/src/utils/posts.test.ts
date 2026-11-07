import { describe, expect, it } from 'vitest';
import { filterAndSortPosts, filterAndSortSeries, groupByYear, seriesNeighbors } from './posts';

const p = (id: string, d: string, draft = false) => ({ id, data: { pubDate: new Date(d), draft } });
const posts = [p('a', '2025-03-01'), p('b', '2026-11-06'), p('c', '2026-01-02', true), p('d', '2024-12-31')];

describe('filterAndSortPosts', () => {
  it('过滤草稿并按日期降序', () => {
    expect(filterAndSortPosts(posts).map((x) => x.id)).toEqual(['b', 'a', 'd']);
  });
  it('includeDrafts 保留草稿', () => {
    expect(filterAndSortPosts(posts, { includeDrafts: true }).map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
  });
  it('不修改入参', () => {
    const copy = [...posts];
    filterAndSortPosts(posts);
    expect(posts).toEqual(copy);
  });
});

describe('groupByYear', () => {
  it('年份降序分组', () => {
    const g = groupByYear(filterAndSortPosts(posts, { includeDrafts: true }));
    expect(g.map((x) => x.year)).toEqual([2026, 2025, 2024]);
    expect(g[0]!.posts.map((x) => x.id)).toEqual(['b', 'c']);
  });
  it('空输入', () => expect(groupByYear([])).toEqual([]));
});

describe('filterAndSortSeries', () => {
  it('只保留系列文章并按 order 排序', () => {
    const input = [
      { id: 'later', data: { title: 'Later', pubDate: new Date('2026-01-01'), series: { id: 'x', order: 2 } } },
      { id: 'other', data: { title: 'Other', pubDate: new Date('2025-01-01'), series: { id: 'y', order: 1 } } },
      { id: 'first', data: { title: 'First', pubDate: new Date('2026-02-01'), series: { id: 'x', order: 1 } } },
    ];
    expect(filterAndSortSeries(input, 'x').map((x) => x.id)).toEqual(['first', 'later']);
  });

  it('按系列顺序返回当前章节的前后项', () => {
    const series = [
      { id: 'intro', title: 'Intro', order: 1 },
      { id: 'practice', title: 'Practice', order: 3 },
      { id: 'graphs', title: 'Graphs', order: 4 },
    ];
    expect(seriesNeighbors(series, 'practice')).toEqual({ prev: series[0], next: series[2] });
    expect(seriesNeighbors(series, 'intro')).toEqual({ next: series[1] });
    expect(seriesNeighbors(series, 'graphs')).toEqual({ prev: series[1] });
  });
});
