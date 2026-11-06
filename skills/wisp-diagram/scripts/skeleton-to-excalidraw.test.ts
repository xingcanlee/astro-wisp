import { describe, expect, it } from 'vitest';
import {
  ARROW_GAP, defaultSkeletonOutput, distanceToEdge, edgeGeometry, EXCALIFONT, loadPalette,
  resolveSkeletonColor, type Skeleton, type SkeletonNode, skeletonToElementSkeletons,
} from './skeleton-to-excalidraw.ts';

const P = loadPalette();

describe('resolveSkeletonColor', () => {
  it('hue 名、语义名、基础色', () => {
    expect(resolveSkeletonColor('blue')).toEqual({ stroke: P.color.hue.blue!.stroke.light, fill: P.color.hue.blue!.fill.light });
    expect(resolveSkeletonColor('k')).toEqual(resolveSkeletonColor(P.color.semantic.k!));
    expect(resolveSkeletonColor(undefined)).toEqual({ stroke: P.color.base.fg!.light, fill: 'transparent' });
    expect(resolveSkeletonColor('muted').stroke).toBe(P.color.base.muted!.light);
  });
  it('未知颜色名报错并列出可用名', () => {
    expect(() => resolveSkeletonColor('pink')).toThrow(/可用：.*blue.*weight/);
  });
});

describe('几何', () => {
  const rect: SkeletonNode = { id: 'r', x: 0, y: 0, w: 100, h: 40 };
  it('distanceToEdge：矩形 / 椭圆 / 菱形', () => {
    expect(distanceToEdge(rect, 1, 0)).toBeCloseTo(50);
    expect(distanceToEdge(rect, 0, 1)).toBeCloseTo(20);
    expect(distanceToEdge({ ...rect, shape: 'ellipse' }, Math.SQRT1_2, Math.SQRT1_2)).toBeLessThan(Math.hypot(50, 20));
    expect(distanceToEdge({ ...rect, shape: 'diamond' }, 1, 0)).toBeCloseTo(50);
  });
  it('edgeGeometry：端点落在两节点边缘外 ARROW_GAP', () => {
    const b: SkeletonNode = { id: 'b', x: 200, y: 0, w: 100, h: 40 };
    const g = edgeGeometry(rect, b);
    expect(g.x).toBeCloseTo(100 + ARROW_GAP);
    expect(g.y).toBeCloseTo(20);
    expect(g.x + g.dx).toBeCloseTo(200 - ARROW_GAP);
    expect(g.dy).toBeCloseTo(0);
  });
  it('节点太近时报错', () => {
    expect(() => edgeGeometry(rect, { id: 'c', x: 104, y: 0, w: 100, h: 40 })).toThrow(/太近/);
  });
});

const SK: Skeleton = {
  style: 'hand',
  nodes: [
    { id: 'q', shape: 'rect', x: 0, y: 0, w: 96, h: 48, label: 'Q', color: 'q' },
    { id: 's', shape: 'ellipse', x: 160, y: 40, w: 120, h: 48, label: 'softmax', color: 'activation', emphasis: true },
    { id: 'd', shape: 'diamond', x: 3, y: 160, w: 96, h: 64, color: 'grad' },
  ],
  edges: [{ from: 'q', to: 's', label: 'QKᵀ/√d' }, { from: 'd', to: 's', dashed: true, arrow: 'both', color: 'muted' }],
  texts: [{ x: 0, y: -32, text: '自注意力', size: 'title' }, { x: 0, y: 240, text: '注', size: 'note' }],
};

describe('skeletonToElementSkeletons', () => {
  const { elements, warnings } = skeletonToElementSkeletons(SK);
  const byType = (t: string) => elements.filter((e) => e.type === t);

  it('元素数量与类型', () => {
    expect(byType('rectangle')).toHaveLength(1);
    expect(byType('ellipse')).toHaveLength(1);
    expect(byType('diamond')).toHaveLength(1);
    expect(byType('arrow')).toHaveLength(2);
    expect(byType('text')).toHaveLength(2);
  });
  it('样式参数取自 palette.diagram', () => {
    const q = elements.find((e) => e.id === 'q')!;
    expect(q.roughness).toBe(P.diagram.excalidraw.roughness);
    expect(q.fillStyle).toBe(P.diagram.excalidraw.fillStyle);
    expect(q.strokeWidth).toBe(P.diagram['stroke-width'].normal);
    expect(q.strokeColor).toBe(P.color.hue.blue!.stroke.light);
    expect(q.roundness).toEqual({ type: 3 });
    expect(q.label).toMatchObject({ text: 'Q', fontSize: P.diagram['font-size-px'].label, fontFamily: EXCALIFONT });
    expect(elements.find((e) => e.id === 's')!.strokeWidth).toBe(P.diagram['stroke-width'].bold);
  });
  it('箭头：绑定 id、标签、虚线、双向', () => {
    const [a1, a2] = byType('arrow');
    expect(a1).toMatchObject({ start: { id: 'q' }, end: { id: 's' }, endArrowhead: 'arrow', startArrowhead: null });
    expect(a1!.label).toMatchObject({ text: 'QKᵀ/√d', fontSize: P.diagram['font-size-px'].note });
    expect(a2).toMatchObject({ strokeStyle: 'dashed', startArrowhead: 'arrow', strokeColor: P.color.base.muted!.light });
  });
  it('文字字号与颜色', () => {
    const [title, note] = byType('text');
    expect(title).toMatchObject({ text: '自注意力', fontSize: P.diagram['font-size-px'].title, strokeColor: P.color.base.fg!.light });
    expect(note).toMatchObject({ fontSize: P.diagram['font-size-px'].note, strokeColor: P.color.base.muted!.light });
  });
  it('不在网格上的坐标给出警告', () => {
    expect(warnings).toEqual(['节点 d 的 x=3 不在 8px 网格上']);
  });
  it('引用不存在的节点 / 重复 id 报错', () => {
    expect(() => skeletonToElementSkeletons({ nodes: SK.nodes, edges: [{ from: 'q', to: 'zz' }] })).toThrow(/不存在/);
    expect(() => skeletonToElementSkeletons({ nodes: [SK.nodes![0]!, SK.nodes![0]!] })).toThrow(/重复/);
  });
});

describe('defaultSkeletonOutput', () => {
  it('去掉 .skeleton.json / .json', () => {
    expect(defaultSkeletonOutput('/a/b.skeleton.json')).toBe('/a/b.excalidraw');
    expect(defaultSkeletonOutput('/a/c.json')).toBe('/a/c.excalidraw');
  });
});
