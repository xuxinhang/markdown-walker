import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position, isEscapableChar } from '../utils';
import Node, { TextNode } from '../nodes';

export default class TextBuilder extends BaseBuilder {
  private backslashEscapeActive: boolean;

  constructor() {
    super();
    this.resetInnerState();
  }

  private resetInnerState() {
    this.backslashEscapeActive = false;
  }

  feed(ch: string, position: Position, currentNode: Node) {
    // ignore control characters
    // if (ch === '\n' || ch === '\r' || ch === '\u0002' || ch === '\u0003' || ch === '\0') return;
    let text: string;

    if (ch === '\\' && !this.backslashEscapeActive) {
      this.backslashEscapeActive = true;
      return;
    }

    if (ch === '\0') {
      return BUILD_MSG_TYPE.END;
      // return { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode.parentNode };
    }

    if (this.backslashEscapeActive) {
      text = isEscapableChar(ch) ? ch : `\\${ch}`;
      this.backslashEscapeActive = false;
    } else {
      text = ch;
    }

    currentNode.appendText(text, position);
    return { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode };

    // // attach characters to tailed text node
    // if (currentNode instanceof Node) {
    //   const tailNode = currentNode.lastChild;
    //   if (tailNode instanceof TextNode) {
    //     tailNode.value += ch
    //     return;
    //   }
    // }
    // const node = new TextNode(ch, position);
    // currentNode.appendChild(node);
  }
}
