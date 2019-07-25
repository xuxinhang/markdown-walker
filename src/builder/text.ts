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
    let text: string;

    if (ch === '\\' && !this.backslashEscapeActive) {
      this.backslashEscapeActive = true;
      return;
    }

    if (ch === '\0') {
      return { end: true };
    }

    if (this.backslashEscapeActive) {
      text = isEscapableChar(ch) ? ch : `\\${ch}`;
      this.backslashEscapeActive = false;
    } else {
      text = ch;
    }

    currentNode.appendText(text, position);
    return { node: currentNode };
  }
}
