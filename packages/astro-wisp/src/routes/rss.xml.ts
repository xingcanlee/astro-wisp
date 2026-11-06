import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
// 静态导入 MDX 的服务端渲染器（而不是 loadRenderers 的动态 import）：
// 主题作为依赖安装时，站点根目录看不到 @astrojs/mdx，运行时按包名解析会失败；静态导入由 Vite 打进产物。
import mdxServer from '@astrojs/mdx/server.js';
import { render } from 'astro:content';
import { getPosts } from '../utils/posts';
import config from 'virtual:wisp/config';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  const site = context.site ?? new URL(config.siteUrl);

  let container: AstroContainer | undefined;
  if (config.rss.fullText) {
    container = await AstroContainer.create({ renderers: [{ name: 'astro:jsx', ssr: mdxServer }] });
  }

  const items = await Promise.all(
    posts.map(async (post) => {
      const link = `/posts/${post.id}/`;
      let content: string | undefined;
      if (container) {
        try {
          const { Content } = await render(post);
          content = await container.renderToString(Content);
          // 正文中的站内相对链接改写为绝对地址，RSS 阅读器里才能打开
          content = content.replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${new URL('/', site).href}`);
        } catch {
          // 含交互组件（React island 等）的文章无法在 RSS 中渲染：降级为摘要 + 原文链接
          const url = new URL(link, site).href;
          content = `<p>${post.data.description}</p><p>本文包含交互内容，请<a href="${url}">阅读原文</a>。</p>`;
        }
      }
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        link,
        categories: [...(post.data.category ? [post.data.category] : []), ...post.data.tags],
        ...(content ? { content } : {}),
      };
    }),
  );

  return rss({
    title: config.site.title,
    description: config.site.description,
    site,
    items,
    trailingSlash: true,
    customData: `<language>${config.site.lang}</language>`,
  });
}
