import Node, { TextNode } from "../nodes";

export class Point {
  line: number;
  column: number;
  offset: number;
  constructor(line: number, column: number, offset: number) {
    this.line = line;
    this.column = column;
    this.offset = offset;
  }
  [Symbol.toPrimitive](hint: string) {
    if (hint === 'string') {
      return `${this.offset}(${this.line},${this.column})`;
    }
    return this;
  }
}

export class Position {
  // indent 暂未实现
  indent?: number[];
  start?: Point;
  end?: Point;
  constructor(start?: Point, end?: Point, indent = [] as number[]) {
    this.start = start;
    this.end = end;
    this.indent = indent;
  }
  setStart(point: Point) {
    this.start = point;
  }
  setEnd(point: Point) {
    this.end = point;
  }
  [Symbol.toPrimitive](hint: string) {
    if (hint === 'string') {
      return `${this.start} -> ${this.end} [${this.indent}]`;
    }
    return this;
  }
}

/**
 * [TODO] Merge source node into target node.
 */
export function mergeNode (target: Node | null, source: Node | null) {
  if (target instanceof TextNode && source instanceof TextNode) {
    target.value = target.value + source.value;
    return target;
  }

  return false;
}

export function mergeChildNodes(parent: Node) {
  let node = parent.firstChild, next = null;
  while (node) {
    next = node.nextSibling;
    if (node instanceof TextNode && next instanceof TextNode) {
      next.value = node.value + next.value;
      parent.removeChild(node);
    }
    node = next;
  }
  return parent;
}

export function findParentNode (startNode: Node, fn: (node: Node) => boolean) {
  let node = startNode;
  while (node && !fn(node)) node = node.parentNode || null;
  return node;
}

export function repeatChar(pattern: string, count: number) {
  // From https://stackoverflow.com/a/5450113
  if (count < 1) return '';
  var result = '';
  while (count > 1) {
    if (count & 1) result += pattern;
    count >>= 1, pattern += pattern;
  }
  return result + pattern;
}

export function isUnicodeWhitespaceChar(str: string) {
  /**
   * Reference
   * https://en.wikipedia.org/wiki/Unicode_character_property#General_Category
   * https://unicode.org/Public/13.0.0/ucd/UnicodeData-13.0.0d1.txt
   */
  const c = str.charCodeAt(0);
  return c === 0x9 || c === 0xd || c === 0xa || c === 0xc || // tab, return, newline, form feed
    c == 0x20 || c == 0xa0 || c == 0x1680 || // Unicode Zs general category
    0x2000 <= c&&c <= 0x200a || c === 0x202f || c === 0x205f || c === 0x3000
}

export function isWhitespaceChar(str: string) {
  return str === '\t' || str === ' ' || str === '\v' || str === '\r' || str === '\n' || str === '\f';
}

export function isASCIIPunctuationChar(str: string) {
  const c = str.charCodeAt(0);
  return 0x21 <= c&&c <= 0x2f || 0x3a <= c&&c <= 0x40 || 0x5b <= c&&c <= 0x60 || 0x7b <= c&&c <= 0x7e;
}

export function isPunctuationChar(str: string) {
  // [TODO] // or anything in the Unicode categories Pc, Pd, Pe, Pf, Pi, Po, or Ps.
  // https://github.com/commonmark/commonmark.js/blob/master/lib/inlines.js#L39
  return isASCIIPunctuationChar(str);
}

export function isASCIIControlChar(str: string) {
  const c = str.charCodeAt(0);
  return c <= 31 || c === 127;
}

export function isASCIISpace(str: string): boolean {
  return str === ' ';
}

export function isEscapableChar(c: string): boolean {
  return isASCIIPunctuationChar(c);
}
