import BaseBuilder from './_base';
import { Position, isEscapableChar } from '../utils';
import Node from '../nodes';
import { BuildCommand } from '../cmd';

export default class TextBuilder extends BaseBuilder {
  private backslashEscapeActive: boolean;

  constructor() {
    super();
    this.resetInnerState();
  }

  private resetInnerState() {
    this.backslashEscapeActive = false;
  }

  feed(ch: string, position: Position, currentNode: Node): BuildCommand {
    // ignore control characters
    // if (ch === '\n' || ch === '\r' || ch === '\u0002' || ch === '\u0003' || ch === '\0') return;
    let text: string;

    if (ch === '\\' && !this.backslashEscapeActive) {
      this.backslashEscapeActive = true;
      return;
    }

    if (ch === '\0') {
      return { end: true };
      // return { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode.parentNode };
    }

    if (this.backslashEscapeActive) {
      text = isEscapableChar(ch) ? ch : `\\${ch}`;
      this.backslashEscapeActive = false;
    } else {
      text = ch;
    }

    currentNode.appendText(text, position);
    return { node: currentNode };

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
