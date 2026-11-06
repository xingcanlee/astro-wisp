# 交互讲解组件

交互讲解用于逐步演示算法和数学过程，例如矩阵乘法每一步的乘加、排序每一次交换。主题提供**通用积木**（`astro-wisp/explainers`）：步骤协议、播放器、SVG 原语。具体讲解（矩阵乘、排序、注意力……）由站点组合这些积木来写，通常和文章放在同一个目录里。

它们是 React 组件，以 Astro island 的形式嵌入 MDX，只在用到的文章中加载（包括样式）。

## 一、准备

```bash
pnpm astro add react   # Astro 官方 React 集成
pnpm add motion        # 格子高亮的过渡动画
```

只有 `.mdx` 文件可以使用组件，`.md` 文件请改名为 `.mdx`。

## 二、积木

| 导出 | 层 | 用途 |
|---|---|---|
| `Step<S>`、`Timeline<S>` | core | 一帧 = `{ state, caption, focus? }`。渲染器只依赖 state |
| `record(initial, (state, emit) => …)` | core | 把**命令式**算法录成时间线：直接修改 state，在需要停顿处 `emit(caption, focus)`，每次保存深拷贝 |
| `cellId(m, r, c)`、`itemId(m, i)`、`focusOf(focus, m)` | core | 高亮 id 约定（`'a:1,0'`、`'arr:3'`）与按前缀取出 |
| `formatNumber`、`formatMatrix` | core | 数字格式化（真正的减号、去掉多余的 0） |
| `Tone`、`toneStroke`、`toneFill` | core | 色调：调色板中的语义色（`q`、`k`、`v`、`visited`、`done`……）或 hue（`blue`、`amber`……） |
| `Explainer` | react | 外壳：`<figure>` + 标题 + `Player` |
| `Player`、`usePlayer` | react | 播放 / 暂停 / 单步 / 进度 / 速度 / 键盘 / `aria-live`；界面文字随站点语言（中文 / 英文），可用 `labels` 覆盖 |
| `Stage` | react | SVG 舞台：viewBox 自适应宽度、窄屏横向滚动、四周留白 |
| `Matrix`、`Cell`、`Label` | react | 二维格子（矩阵、DP 表、注意力权重；1 行即数组）、单个格子、文字 |

core 是纯 TypeScript（`astro-wisp/explainers/core`），不依赖 React / DOM，可以在 vitest 中直接测试。

## 三、写一个讲解

以冒泡排序为例，放在文章目录 `src/content/posts/bubble-sort/` 中。

### 1. 算法：输入 → 全部步骤

```ts
// bubble-sort.ts
import { itemId, record } from 'astro-wisp/explainers/core';

export interface SortState { arr: number[]; sorted: number }

export const bubbleSort = (input: number[]) =>
  record<SortState>({ arr: input, sorted: 0 }, (s, emit) => {
    emit('初始数组');
    for (let i = 0; i < s.arr.length - 1; i++) {
      for (let j = 0; j < s.arr.length - 1 - i; j++) {
        if (s.arr[j] > s.arr[j + 1]) {
          [s.arr[j], s.arr[j + 1]] = [s.arr[j + 1], s.arr[j]];
          emit(`交换 ${s.arr[j + 1]} 和 ${s.arr[j]}`, [itemId('arr', j), itemId('arr', j + 1)]);
        }
      }
      s.sorted = i + 1;
    }
    emit('排序完成');
  });
```

- 每一步都要有 `caption`：完整的句子，包含具体数字。
- 写成纯函数也可以（直接返回 `Step[]`，见演示站的 `matmul.ts`）；`record()` 适合原地修改的算法。
- 为算法写 vitest 单测，放在同目录（`bubble-sort.test.ts`）。

### 2. 画面：一帧 → SVG

```tsx
// BubbleSort.tsx
import { useMemo } from 'react';
import { CELL, Explainer, Matrix, Stage, focusOf } from 'astro-wisp/explainers';
import { bubbleSort } from './bubble-sort';

export default function BubbleSort({ input }: { input: number[] }) {
  const steps = useMemo(() => bubbleSort(input), [input]);
  return (
    <Explainer steps={steps} title="冒泡排序">
      {({ state, focus }) => (
        <Stage width={state.arr.length * CELL} height={CELL} label={`数组：${state.arr.join(', ')}`}>
          <Matrix
            x={0} y={0} values={[state.arr]} tone="visited"
            highlight={new Set([...focusOf(focus, 'arr')].map((i) => `0,${i}`))}
          />
        </Stage>
      )}
    </Explainer>
  );
}
```

### 3. 在文章中使用

```mdx
import BubbleSort from './BubbleSort';

<BubbleSort client:visible input={[5, 1, 4, 2, 8]} />
```

完整的例子见演示站的矩阵乘法：`src/content/posts/matrix-multiplication/` 下的 `matmul.ts`（算法 + 单测）、`MatMul.tsx`（画面）、`matmul.css`（文章私有样式）。

## 四、操作方式

| 操作 | 鼠标 | 键盘（播放器获得焦点时） |
|---|---|---|
| 播放 / 暂停 | ▶ 按钮 | Space |
| 上一步 / 下一步 | ◀ ▶ 按钮 | ← / → |
| 第一步 / 最后一步 | — | Home / End |
| 拖动进度 | 进度条 | — |
| 速度 | 0.5× / 1× / 2× | — |

- 每一步的说明位于 `aria-live="polite"` 区域，屏幕阅读器会读出。
- 开启系统的“减少动态效果”（`prefers-reduced-motion`）后，不会自动播放，也不做过渡动画。
- 没有 JavaScript 时，页面显示第一步的静态内容。

## 五、约定

| 层 | 允许 | 禁止 |
|---|---|---|
| 算法（core） | 纯 TS、类型、算术 | React、DOM、颜色、Motion |
| 画面（React） | 积木、Motion、SVG、令牌（`Tone` / `var(--wisp-*)`） | 业务算法、十六进制颜色、Tailwind 原始色阶、`dark:` 颜色变体 |
| 文章 | `client:visible` 导入组件 | 在 `.md` 中使用组件 |

- SVG 一律通过 `Stage` 输出（viewBox、宽度 100%）；移动端每个格子至少 28px。
- 讲解私有的样式写在组件旁的 `.css` 中，并包在 `@layer utilities { … }` 里（正文内容样式与 `.prose` 同层，见[配置参考](./configuration.md#customcss)）。
- 默认 SVG 元素数量控制在 2000 以内，超出时改用 `<canvas>`。
- 需要新的通用原语（如箭头、数组指针）时，优先加到主题的 `astro-wisp/explainers`，而不是在每个讲解里各写一份。
