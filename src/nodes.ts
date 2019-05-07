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

export class Node {
  type: string;
  children: Node[];
  position: Position;
  constructor(type = 'Node', children = [] as Node[], position: Position) {
    this.type = type !== undefined ? type : 'Node';
    this.children = children !== undefined ? children : [];
    this.position = position !== undefined
      ? position
      : new Position(new Point(0,1,2), new Point(1,2,3));
  }
}


export class RootNode extends Node {
  constructor({ position, children = [] }: { position: Position, children?: Node[] }) {
    super('Root', children, position);
  }
}

export class HeadingNode extends Node {
  depth: number;
  constructor({ position, depth, children }: { position: Position, depth: number, children: Node[] }) {
    super('Heading', children, position);
    this.depth = depth;
  }
}

export class ParagraphNode extends Node {
  constructor(position: Position, children = []) {
    super('Paragraph', children, position);
  }
}

export class TextNode extends Node {
  value: string;
  constructor(value: string, position: Position) {
    super('Text', undefined, position);
    this.value = value;
  }
}


export default {
  // node classes
  Root: RootNode,
  Heading: HeadingNode,
  Text: TextNode,
  // basic classes
  Node: Node,
  Point: Point,
  Position: Position,
};