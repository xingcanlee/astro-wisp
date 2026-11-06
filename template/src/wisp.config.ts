import { defineWispConfig } from './wisp/config';

export default defineWispConfig({
  site: {
    title: '我的博客',
    description: '记录值得分享的技术思考',
    author: '你的名字',
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
    codeFold: { enabled: true, maxLines: 24, previewLines: 12 },
  },
  mermaid: { strict: false },
  rss: { fullText: true },
  taxonomy: { slugMap: {} },
});
