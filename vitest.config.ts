import { getViteConfig } from 'astro/config';

// 通过 getViteConfig 加载 astro.config：主题集成注册的虚拟模块（virtual:wisp/*）在测试中同样可用。
export default getViteConfig({
  test: {
    include: ['packages/astro-wisp/{src,scripts}/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
} as any);
