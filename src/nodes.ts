import { Point, Position } from './utils';


export class Node {
  type: string;
  position: Position;
  parentNode: PaternalNode | null;

  constructor(type = 'Node', position: Position) {
    this.type = type !== undefined ? type : 'Node';
    this.position = position !== undefined
      ? position
      : new Position(new Point(0,1,2), new Point(1,2,3));
    this.parentNode = null;
  }

  // Subclasses
  static Root: Function;
  static Heading: Function;
  static Paragraph: Function;
  static Text: Function;
}

export class PaternalNode extends Node {
  children: Node[];
  constructor(type = 'PaternalNode', children = [] as Node[], position: Position) {
    super(type, position);
    this.children = children;
  }

  public appendChild(child: Node) {
    this.children.push(child);
    child.parentNode = this;
  }

  public insertBefore(newNode: Node, referenceNode: Node) {
    const referenceIndex = this.children.indexOf(referenceNode);
    if (referenceIndex === -1) {
      return false;
    }
    this.children.splice(referenceIndex, 0, newNode);
  }

  public removeChild(removedNode: Node) {
    const removedIndex = this.children.indexOf(removedNode);
    if (removedIndex === -1) {
      return false;
    }
    this.children.splice(removedIndex, 1);
  }
}

class RootNode extends PaternalNode {
  constructor({ position, children = [] }: { position: Position, children?: Node[] }) {
    super('Root', children, position);
  }
}

class HeadingNode extends PaternalNode {
  depth: number;
  constructor({ position, depth, children }: { position: Position, depth: number, children: Node[] }) {
    super('Heading', children, position);
    this.depth = depth;
  }
}

class ParagraphNode extends PaternalNode {
  constructor(position: Position, children = []) {
    super('Paragraph', children, position);
  }
}

class TextNode extends Node {
  value: string;
  constructor(value: string, position: Position) {
    super('Text', position);
    this.value = value;
  }
}

Node.Text = TextNode;
Node.Paragraph = ParagraphNode;
Node.Heading = HeadingNode;

export default Node;
export { Position, Point };
export {
  RootNode,
  TextNode,
  ParagraphNode,
  HeadingNode,
}

/* export default {
  // node classes
  Root: RootNode,
  Heading: HeadingNode,
  Text: TextNode,
  // basic classes
  Node: Node,
  Point: Point,
  Position: Position,
}; */
