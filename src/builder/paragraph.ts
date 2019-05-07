// import CONT from '../symbols';
import BaseBuilder from './_base';
import { Point } from '../nodes';
import { BUILD_CMD } from './_base';

export default class ParagraphBuilder extends BaseBuilder {
  readyStart = true;
  nodeInside = false;
  lineBreakCount = 0;
  ventureStarted: boolean = false;
  ventureConfirmed: boolean = false;

  reset() {
    this.readyStart = true;
    this.ventureStarted = false;
    this.ventureConfirmed = false;
  }

  update(ch: string, point: Point) {
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
  }
};