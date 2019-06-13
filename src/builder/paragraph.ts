// import CONT from '../symbols';
import BaseBuilder, { BUILD_MSG_TYPE, BuildCmd } from './_base';
import Node, { Point, ParagraphNode, Position, RootNode } from '../nodes';

export default class ParagraphBuilder extends BaseBuilder {
  readyStart = true;
  nodeInside = false;
  lineBreakCount = 0;
  // ventureStarted: boolean = false;
  // ventureConfirmed: boolean = false;

  reset(ch: string, position: Position): BuildCmd {
    this.readyStart = true;
    // this.ventureStarted = false;
    // this.ventureConfirmed = false;
    return { type: BUILD_MSG_TYPE.NONE };
  }

  feed(ch: string, position: Position, currentNode?: Node) {
    if (ch === '\u0002') { // start of file
      this.lineBreakCount = 2;
      return;
    }

    if (ch === '\u0003') { // end of file
      if (currentNode.type !== 'paragraph') { // [TODO] 放到哪里去判断
        this.lineBreakCount = 0;
        return { type: BUILD_MSG_TYPE.CLOSE_NODE_UNPAIRED };
      } else {
        return [ BUILD_MSG_TYPE.CLOSE_NODE ];
      }
    }

    if (ch === '\n') {
      this.lineBreakCount++;
      return; // BUILD_MSG_TYPE.TERMINATE;
    }

    // other chars
    if (this.lineBreakCount >= 2) {
      const newNode = new ParagraphNode(position);
      this.lineBreakCount = 0;

      if (currentNode.type === 'root') {
        return { type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE, payload: newNode };
      }

      if (currentNode.type !== 'paragraph') { // [TODO] 放到哪里去判断
        return { type: BUILD_MSG_TYPE.CLOSE_NODE_UNPAIRED };
      }

      return [
        BUILD_MSG_TYPE.CLOSE_NODE,
        { type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE, payload: newNode },
        BUILD_MSG_TYPE.CONTINUE,
      ];
    } else {
      this.lineBreakCount = 0;
      return;
    }
  }
};