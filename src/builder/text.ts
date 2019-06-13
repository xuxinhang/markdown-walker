import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position } from '../utils';
import Node, { TextNode, PaternalNode } from '../nodes';

export default class TextBuilder extends BaseBuilder {
  feed(ch: string, position: Position, currentNode: Node) {
    // ignore control characters
    if (ch === '\n' || ch === '\r' || ch === '\u0002' || ch === '\u0003') return;

    // attach characters to tailed text node
    if (currentNode instanceof PaternalNode) {
      const tailNode = currentNode.lastChild;
      if (tailNode instanceof TextNode) {
        tailNode.value += ch
        return;
      }
    }

    return { type: BUILD_MSG_TYPE.COMMIT_NODE, payload: new TextNode(ch, position) };
  }
}
