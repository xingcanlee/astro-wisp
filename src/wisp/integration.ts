import type { AstroIntegration } from 'astro';

/**
 * Wisp 主题集成：注册 remark/rehype 插件、Shiki 配置、图表源文件下载。
 * 由编排者（T0/T14）维护，子任务只导出函数，在报告中给出接线方式。
 */
export default function wisp(): AstroIntegration {
  return {
    name: 'astro-wisp',
    hooks: {
      'astro:config:setup': () => {
        // T14: 接线 remark 插件 / shiki / 图表下载
      },
    },
  };
}
