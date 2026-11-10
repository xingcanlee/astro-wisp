import { getCollection, type CollectionEntry } from 'astro:content';

export type PostEntry = CollectionEntry<'posts'>;

export interface SeriesItem {
  id: string;
  title: string;
  order: number;
}

export interface SeriesNeighbors {
  prev?: SeriesItem;
  next?: SeriesItem;
}

/** 纯逻辑只依赖这几个字段，便于单测。 */
export interface PostLike {
  id: string;
  data: { pubDate: Date; draft: boolean };
}

/** 过滤草稿（includeDrafts 为 true 时保留），按 pubDate 降序；同时间按 id 升序以保持稳定。 */
export function filterAndSortPosts<T extends PostLike>(
  posts: T[],
  opts: { includeDrafts?: boolean } = {},
): T[] {
  return posts
    .filter((p) => opts.includeDrafts || !p.data.draft)
    .sort(
      (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id),
    );
}

/** 按发布年份分组，年份降序，组内保持输入顺序。 */
export function groupByYear<T extends PostLike>(posts: T[]): Array<{ year: number; posts: T[] }> {
  const map = new Map<number, T[]>();
  for (const p of posts) {
    const y = p.data.pubDate.getUTCFullYear();
    (map.get(y) ?? map.set(y, []).get(y)!).push(p);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([year, posts]) => ({ year, posts }));
}

/** 按系列顺序返回文章导航项，未加入该系列的文章不参与排序。 */
export function filterAndSortSeries<
  T extends {
    id: string;
    data: { title: string; pubDate: Date; series?: { id: string; order: number } };
  },
>(posts: T[], seriesId: string): SeriesItem[] {
  return posts
    .filter((post) => post.data.series?.id === seriesId)
    .sort(
      (a, b) =>
        a.data.series!.order - b.data.series!.order ||
        a.data.pubDate.getTime() - b.data.pubDate.getTime() ||
        a.id.localeCompare(b.id),
    )
    .map((post) => ({ id: post.id, title: post.data.title, order: post.data.series!.order }));
}

/** 返回当前系列文章的前后章节；系列顺序优先于全站发布时间。 */
export function seriesNeighbors(series: SeriesItem[], currentId: string): SeriesNeighbors {
  const index = series.findIndex((item) => item.id === currentId);
  return {
    prev: index > 0 ? series[index - 1] : undefined,
    next: index >= 0 && index < series.length - 1 ? series[index + 1] : undefined,
  };
}

/**
 * 唯一的取数入口。默认在生产环境过滤草稿，dev 环境显示草稿；
 * 显式传 includeDrafts 可覆盖。
 */
export async function getPosts(opts: { includeDrafts?: boolean } = {}): Promise<PostEntry[]> {
  const includeDrafts = opts.includeDrafts ?? import.meta.env.DEV;
  return filterAndSortPosts(await getCollection('posts'), { includeDrafts });
}

export interface SeriesSummary {
  /** frontmatter 中的 series.id */
  id: string;
  /** 系列名：取系列中 order 最小的一篇（通常是总览篇）的标题 */
  title: string;
  description?: string;
  /** 系列第一篇（总览篇）的文章 id，用作入口 */
  firstId: string;
  items: SeriesItem[];
  /** 系列中最新一篇的发布时间 */
  updated: Date;
}

/** 把文章按 series.id 分组成系列摘要，按最近更新时间降序；同时间按系列 id 升序。 */
export function summarizeSeries<
  T extends {
    id: string;
    data: {
      title: string;
      description?: string;
      pubDate: Date;
      series?: { id: string; order: number };
    };
  },
>(posts: T[]): SeriesSummary[] {
  const ids = [...new Set(posts.map((p) => p.data.series?.id).filter((id): id is string => !!id))];
  return ids
    .map((id) => {
      const items = filterAndSortSeries(posts, id);
      const members = posts.filter((p) => p.data.series?.id === id);
      const first = members.find((p) => p.id === items[0]!.id)!;
      return {
        id,
        title: first.data.title,
        description: first.data.description,
        firstId: first.id,
        items,
        updated: new Date(Math.max(...members.map((p) => p.data.pubDate.getTime()))),
      };
    })
    .sort((a, b) => b.updated.getTime() - a.updated.getTime() || a.id.localeCompare(b.id));
}
