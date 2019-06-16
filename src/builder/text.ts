import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position } from '../utils';
import Node, { TextNode } from '../nodes';

export default class TextBuilder extends BaseBuilder {
  feed(ch: string, position: Position, currentNode: Node) {
    // ignore control characters
    if (ch === '\n' || ch === '\r' || ch === '\u0002' || ch === '\u0003' || ch === '\0') return;

    // attach characters to tailed text node
    if (currentNode instanceof Node) {
      const tailNode = currentNode.lastChild;
      if (tailNode instanceof TextNode) {
        tailNode.value += ch
        return;
      }
    }

    const node = new TextNode(ch, position);
    currentNode.appendChild(node);
    return { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode };
  }
}
