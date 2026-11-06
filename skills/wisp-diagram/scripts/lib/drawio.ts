import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/** draw.io 的压缩格式：URI 编码 → deflate-raw → base64。 */
export function compressDiagram(xml: string): string {
  return deflateRawSync(Buffer.from(encodeURIComponent(xml), 'utf8')).toString('base64');
}

export function decompressDiagram(data: string): string {
  const raw = inflateRawSync(Buffer.from(data.trim(), 'base64')).toString('utf8');
  return decodeURIComponent(raw);
}

const DIAGRAM_RE = /(<diagram\b[^>]*>)([\s\S]*?)(<\/diagram>)/g;
const isCompressed = (body: string) => body.trim() !== '' && !body.trim().startsWith('<');

export interface DrawioPage { index: number; id?: string; name?: string; compressed: boolean }

/** 列出页面。返回 DrawioPage[]（对象，不是页面名字符串数组）；用 `.map((p) => p.name)` 取名称。 */
export function listPages(xml: string): DrawioPage[] {
  const pages: DrawioPage[] = [];
  let i = 0;
  for (const m of xml.matchAll(DIAGRAM_RE)) {
    const open = m[1]!;
    const get = (n: string) => new RegExp(`\\s${n}="([^"]*)"`).exec(open)?.[1];
    pages.push({ index: i++, id: get('id'), name: get('name'), compressed: isCompressed(m[2]!) });
  }
  return pages;
}

const xmlOpts = {
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
  trimValues: true,
  parseAttributeValue: false,
  parseTagValue: false,
} as const;

/** 统一缩进，保证 git diff 稳定。 */
function format(xml: string): string {
  const tree = new XMLParser(xmlOpts).parse(xml);
  const out = new XMLBuilder({ ...xmlOpts, format: true, indentBy: '  ', suppressEmptyNode: true }).build(tree) as string;
  return out.trim() + '\n';
}

/** 把所有页面解压为明文 XML 并统一格式；幂等。 */
export function normalizeDrawio(xml: string): string {
  const plain = xml.replace(DIAGRAM_RE, (_m, open: string, body: string, close: string) =>
    isCompressed(body) ? `${open}${decompressDiagram(body)}${close}` : `${open}${body}${close}`);
  return format(plain);
}
