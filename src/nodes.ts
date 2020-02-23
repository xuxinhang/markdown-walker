import { Point, Position } from './utils';
import { inspectNodeTree } from './utils/dev';

interface NodeInnerData {
  [key: string]: any;
}

const inspectCustomSymbol = Symbol.for('nodejs.util.inspect.custom');

export class Node {
  type: string;
  position: Position;
  parentNode: Node;
  children: Node[];
  rawContent: string;
  protected innerData: NodeInnerData;

  constructor(type = 'Node', position: Position, children = [] as Node[]) {
    this.type = type !== undefined ? type : 'Node';
    this.position = position !== undefined
      ? position
      : new Position(new Point(0,1,2), new Point(1,2,3));
    this.parentNode = null;
    this.innerData = {};
    this.children = children;
    this.rawContent = '';
  }

  // inner data store
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

  // child node operation
  public appendChild(child: Node) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  // access child nodes
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

  public insertBefore(newNode: Node, referenceNode: Node): Node {
    const referenceIndex = this.children.indexOf(referenceNode);
    if (referenceIndex === -1) {
      throw 'The node before which the new node is to be inserted is not a child of this node.';
      // return null;
    }
    this.children.splice(referenceIndex, 0, newNode);
    newNode.parentNode = this;
    return newNode;
  }

  public removeChild(removedNode: Node): Node {
    const removedIndex = this.children.indexOf(removedNode);
    if (removedIndex === -1) {
      return null;
    }
    const removed = this.children.splice(removedIndex, 1);
    if (removed[0]) {
      removed[0].parentNode = null;
      return removed[0] || null;
    } else {
      return null;
    }
  }

  public replaceChild(newChild: Node, oldChild: Node) {
    this.insertBefore(newChild, oldChild);
    this.removeChild(oldChild);
  }

  // extended methods
  public appendText(text: string, position: Position): Node {
    // attach characters to tailed text node
    const tailNode = this.lastChild;
    if (tailNode instanceof TextNode && tailNode.allowAppendText) {
      tailNode.value += text;
      return;
    }
    const node = new TextNode(text, position);
    this.appendChild(node);
    return node;
  }

  public insertTextBefore(refNode: Node, text: string, position: Position): Node {
    const i = this.children.indexOf(refNode);
    if (i === -1) throw 'The reference node is not a child of this node.';

    const node = this.children[i];
    if (node instanceof TextNode) {
      node.value = text + node.value;
      return node;
    }

    const preNode = i > 0 ? this.children[i-1] : null
    if (preNode && preNode instanceof TextNode) {
      preNode.value = preNode.value + text;
      return preNode;
    }

    const newNode = new TextNode(text, position);
    this.insertBefore(newNode, refNode);
    return newNode;
  }

  // for debug
  [inspectCustomSymbol]() {
    return inspectNodeTree(this);
  }
}

export class RootNode extends Node {
  constructor(position: Position, children = [] as Node[]) {
    super('root', position, children);
  }
}

export class HeadingNode extends Node {
  depth: number;
  constructor({ position, depth, children }: { position: Position, depth: number, children: Node[] }) {
    super('heading', position, children);
    this.depth = depth;
  }
}

export class ParagraphNode extends Node {
  constructor(position: Position, children = []) {
    super('paragraph', position, children);
  }
}

export class TextNode extends Node {
  value: string;
  allowAppendText: boolean;
  constructor(value: string, position: Position) {
    super('text', position);
    this.value = value;
    this.allowAppendText = true;
  }
}

export class EmphasisNode extends Node {
  bulletCount: number = 1;
  bulletChar: string = '';
  bulletOpenRunLength?: number;
  bulletCloseRunLength?: number;
  bulletOpenCanBothOpenAndClose?: boolean;
  constructor(position: Position) {
    super('emphasis', position);
  }
}

export class StrongNode extends EmphasisNode {
  constructor(position: Position) {
    super(position);
    this.type = 'strong';
  }
}

export class LinkNode extends Node {
  constructor(position: Position, dest: string = '', title: string = '') {
    super('link', position);
    this.dest = dest;
    this.title = title;
  }
  dest: string = '';
  title: string = '';
}

export class CodeSpanNode extends Node {
  constructor(position: Position, value: string = '') {
    super('codeSpan', position);
    this.value = value;
  }
  value: string = '';
}

export enum AutolinkType { URI = 'URI', Email = 'email' };

export class AutolinkNode extends Node {
  dest: string;
  linkType: AutolinkType;

  constructor(position: Position, dest: string = '', type: AutolinkType = AutolinkType.URI) {
    super('autolink', position);
    this.dest = dest;
    this.linkType = type;
  }
}

export class StrikeNode extends Node {
  bulletCount?: number;
  constructor(position: Position) {
    super('strike', position);
  }
}

export class MarkNode extends Node {
  bulletCount?: number;
  constructor(position: Position) {
    super('mark', position);
  }
}

export default Node;
export { Position, Point };
