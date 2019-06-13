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

export function findParentNode (startNode: Node, fn: (node: Node) => boolean) {
  let node = startNode;
  while (node && !fn(node)) node = node.parentNode || null;
  return node;
}
