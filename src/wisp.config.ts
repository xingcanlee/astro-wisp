import { defineWispConfig } from './wisp/config';

export default defineWispConfig({
  site: {
    title: 'Wisp',
    description: '安静好读的技术博客',
    author: 'Wisp',
    lang: 'zh-CN',
    url: 'https://example.com',
  },
  nav: [
    { label: '归档', href: '/archive/' },
    { label: '标签', href: '/tags/' },
    { label: '关于', href: '/about/' },
  ],
  social: [{ kind: 'rss', href: '/rss.xml' }],
  home: { featuredCount: 3, pageSize: 10 },
  features: {
    codeCopy: true,
    lineNumbers: true,
    math: true,
    mermaid: true,
    toc: true,
    diagramDownload: true,
  },
  mermaid: { strict: false },
  rss: { fullText: true },
  taxonomy: { slugMap: {} },
});
