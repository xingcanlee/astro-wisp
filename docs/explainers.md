# 交互式讲解组件（Explainers）

用于演示算法原理、矩阵乘、注意力机制、LLM 推理过程等。使用 React 19 + Motion，以 Astro island 的形式嵌入 MDX。

**主题只提供通用积木**（`astro-wisp/explainers`），不内置具体讲解。具体讲解（矩阵乘、排序、注意力……）由站点组合积木实现，通常放在文章目录里。这样主题组件保持通用、可复用，站点不需要的讲解也不会进入主题包。React、react-dom、motion 是主题的可选 peer 依赖。

## 1. 分层

```
packages/astro-wisp/src/explainers/
├─ index.ts                      # astro-wisp/explainers（core + React）
├─ core/                         # astro-wisp/explainers/core：纯 TS，不能 import react 或 DOM
│  ├─ timeline.ts                # Step<S> = { state; caption; focus? }、record()、cellId/itemId/focusOf
│  ├─ format.ts                  # 数字、矩阵格式化
│  ├─ tones.ts                   # Tone（语义色 | hue）→ var(--wisp-sem-*) / var(--wisp-hue-*)
│  └─ tones.generated.ts         # 由调色板生成（pnpm tokens）
├─ react/
│  ├─ Explainer.tsx              # figure + 标题 + Player
│  ├─ Player.tsx / usePlayer.ts  # 通用播放器：播放/暂停/单步/进度/速度/键盘/aria-live
│  ├─ labels.ts                  # 界面文字（中文 / 英文，随站点语言；可逐项覆盖）
│  └─ primitives/                # Stage、Matrix、Cell、Label（SVG 原语，只用令牌）
└─ explainers.css                # 由 Player 引入，只在用到讲解的页面加载

站点 / 文章目录（例：src/content/posts/matrix-multiplication/）
├─ matmul.ts + matmul.test.ts    # 算法：(A, B) => Step<MatMulState>[]
├─ MatMul.tsx                    # 画面：Explainer + Stage + Matrix + Label
└─ matmul.css                    # 文章私有样式（@layer utilities）
```

规则：

1. **算法是 `(input) => Step[]` 形式的纯函数**，预先生成全部步骤；命令式算法用 `record(initial, (state, emit) => …)` 录制（每次 emit 保存深拷贝）。每一步都附带一句 caption，例如“C[1][0] = 3×5 + 4×7 = 43”。算法必须有 vitest 单测。
2. **渲染器是 `(step) => SVG`**，没有内部业务状态。格子高亮由 Motion 做透明度过渡；reduced-motion 下直接切换。
3. **颜色**：只能使用 `Tone`（`toneStroke` / `toneFill`）或 `var(--wisp-*)`，例如矩阵 A 用 `tone="q"`。禁止写十六进制颜色。
4. **尺寸**：SVG 通过 `Stage` 输出（viewBox、宽度 100%、窄屏横向滚动），外壳 `Explainer` 默认放在 `.wisp-wide` 中。移动端每个格子至少 28px。
5. **通用性**：新原语（箭头、指针、柱状条……）在两个以上讲解中会用到时，加进主题的积木，而不是在讲解里各写一份。

## 2. Player 交互约定

| 操作 | 鼠标 | 键盘（Player 获得焦点时） |
|---|---|---|
| 播放 / 暂停 | ▶ 按钮 | Space |
| 上一步 / 下一步 | ◀ ▶ 按钮 | ← / → |
| 第一步 / 最后一步 | | Home / End |
| 拖动进度 | range 滑块 | |
| 速度 | 0.5× / 1× / 2× | |

- caption 区域设置 `aria-live="polite"`。
- 界面文字（按钮名、进度朗读）随站点语言（`site.lang`，zh* → 中文，其余 → 英文），`lang` / `labels` 属性可覆盖。
- reduced-motion 的检测放在 effect 中（首帧与 SSR 一致），不用 Motion 的 `useReducedMotion`：它在客户端首帧就返回真实值，会写进按钮的 `disabled` / `aria-label`，导致 hydration 不匹配。纯视觉过渡（Cell）仍用 Motion 的 hook。
- 在 `prefers-reduced-motion` 下，不自动播放、不做插值，直接切换到下一步的状态。
- **SSR**：Astro 会把第一步渲染成静态 HTML（React 服务端渲染），没有 JS 时显示第一步加上 caption。
- 使用 `client:visible` 进行 hydration。

## 3. MDX 用法

```mdx
import MatMul from './MatMul';

<MatMul client:visible a={[[1, 2], [3, 4]]} b={[[5, 6], [7, 8]]} />
```

## 4. 示例讲解（演示站，不进主题包）

| 讲解 | 内容 | 状态 |
|---|---|---|
| MatMul | 逐元素累加，同时高亮 A 的一行和 B 的一列 | 已有（`src/content/posts/matrix-multiplication/`） |
| Attention | QKᵀ → scale → mask → softmax → ·V，可切换 causal mask | 计划 |
| Sort | 冒泡、快排对比（`record()` 的典型用法） | 计划 |
| KVCache | 逐 token 生成时 cache 的增长 | 计划 |

## 5. 性能边界

SVG 元素数量控制在 2000 以内。超过时（大型 heatmap 等）改用 `<canvas>`，并由该组件自己读取 CSS 变量（`getComputedStyle`），在 `data-theme` 变化时重绘（用 MutationObserver 监听）。
