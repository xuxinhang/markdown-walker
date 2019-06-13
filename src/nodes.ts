import { Point, Position } from './utils';

interface NodeInnerData {
  [key: string]: any;
}

export class Node {
  type: string;
  position: Position;
  parentNode: PaternalNode;
  protected innerData: NodeInnerData;

  constructor(type = 'Node', position: Position) {
    this.type = type !== undefined ? type : 'Node';
    this.position = position !== undefined
      ? position
      : new Position(new Point(0,1,2), new Point(1,2,3));
    this.parentNode = null;
    this.innerData = {};
  }

  public getInnerData(key: string) {
    return this.innerData[key]; // [TODO]
  }

  public setInnerData(key: string, value: any) {
    this.innerData[key] = value;
  }

  public removeInnerData(key: string) {
    if (key in this.innerData) {
      delete this.innerData[key];
    }
  }

  // Subclasses
  static Root: Function;
  static Heading: Function;
  static Paragraph: Function;
  static Text: Function;
}

export class PaternalNode extends Node {
  children: Node[];
  constructor(type = 'PaternalNode', position: Position, children = [] as Node[]) {
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

  get firstChild () {
    const len = this.children.length;
    return len ? this.children[0] : null;
  }

  get lastChild () {
    const len = this.children.length;
    return len ? this.children[len-1] : null;
  }

  get nextSibling () {
    if (!this.parentNode) return null;
    const nodes = this.parentNode.childNodes;
    const i = nodes.indexOf(this);
    return i >= 0 && i <= nodes.length - 2 ? nodes[i+1] : null;
  }

  get childNodes () {
    return this.children;
  }
}

class RootNode extends PaternalNode {
  constructor({ position, children = [] }: { position: Position, children?: Node[] }) {
    super('root', position, children);
  }
}

class HeadingNode extends PaternalNode {
  depth: number;
  constructor({ position, depth, children }: { position: Position, depth: number, children: Node[] }) {
    super('heading', position, children);
    this.depth = depth;
  }
}

class ParagraphNode extends PaternalNode {
  constructor(position: Position, children = []) {
    super('paragraph', position, children);
  }
}

class TextNode extends Node {
  value: string;
  constructor(value: string, position: Position) {
    super('text', position);
    this.value = value;
  }
}

class EmphasisNode extends PaternalNode {
  constructor(position: Position) {
    super('emphasis', position);
  }
}

class StrongNode extends PaternalNode {
  constructor(position: Position) {
    super('strong', position);
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
  EmphasisNode,
  StrongNode,
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
