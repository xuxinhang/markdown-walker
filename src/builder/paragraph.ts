// import CONT from '../symbols';
import BaseBuilder, { BUILD_MSG_TYPE, BuildMsg } from './_base';
import Node, { Point, ParagraphNode, Position } from '../nodes';

export default class ParagraphBuilder extends BaseBuilder {
  readyStart = true;
  nodeInside = false;
  lineBreakCount = 0;
  // ventureStarted: boolean = false;
  // ventureConfirmed: boolean = false;

  reset(ch: string, position: Position): BuildMsg {
    this.readyStart = true;
    // this.ventureStarted = false;
    // this.ventureConfirmed = false;
    return { type: BUILD_MSG_TYPE.NONE };
  }

  feed(ch: string, position: Position, currentNode?: Node) {
    if(ch === '\n') {
      this.lineBreakCount++;
      if(this.lineBreakCount >= 2) {
        this.lineBreakCount = 0;
        return [
          { type: BUILD_MSG_TYPE.CLOSE_NODE },
          {
            type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE,
            payload: new ParagraphNode(position),
          },
        ];
      } else {
        if (currentNode instanceof ParagraphNode) {
          return { type: BUILD_MSG_TYPE.USE };
        } else {
          return {
            type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE,
            payload: new ParagraphNode(position),
          };
        }
      }
    } else {
      this.lineBreakCount = 0;
      return {
        type: BUILD_MSG_TYPE.PREPARE_NODE,
        payload: undefined,
      };
    }
  }

  /*update(ch: string, point: Point) {
    if(ch === undefined) {
      this.reset();
      return BUILD_CMD.VENTURE_START;
    }

    if(ch === '\n') {
      this.lineBreakCount++;
      if(this.readyStart || this.lineBreakCount >= 2) {
        this.readyStart = true;
      }
    }

    if(this.lineBreakCount >= 2) {
      this.ventureConfirmed = this.ventureStarted = false;
      return BUILD_CMD.END_NODE;
    }

    if(ch !== '\n' && this.readyStart) {
      this.lineBreakCount = 0;
      this.readyStart = false;
      this.ventureConfirmed = true;
      return BUILD_CMD.VENTURE_START_CONFIRM;
    }
  }*/
};