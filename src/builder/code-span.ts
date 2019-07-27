import BaseBuilder from './_base';
import { Point, Position } from '../utils';
import Node, { CodeSpanNode } from '../nodes';
import { BuildState, BuildCommand } from '../cmd';

export default class CodeSpanBuilder extends BaseBuilder {
  backtickStrCount: number;
  backtickStrBeginPoint: Point;
  backtickStrEndPoint: Point;

  codeActive: boolean;
  beginBacktickCount: number;
  beginBacktickPoint: Point;
  codeValuePoint: Point;
  endBacktickPoint: Point;
  endBacktickOffset: number;
  endBacktickEndPoint: Point;

  skipMode: boolean;
  skipBeginOffset: number;
  skipEndOffset: number;

  readMode: boolean;
  activeNode: CodeSpanNode;
  onlySpaceChars: boolean;

  constructor() {
    super();
    this.resetInnerState();
  }

  private resetInnerState() {
    this.codeActive = false;
    this.beginBacktickPoint = null;
    this.beginBacktickCount = 0;
    this.codeValuePoint = null;
    this.endBacktickPoint = null;
    this.endBacktickOffset = -1;
    this.endBacktickEndPoint = null;

    this.resetBacktickStrState();
    this.resetSkipModeState();
    this.resetReadModeState();
  }

  private activateSkipMode(endOffset: number) {
    this.skipMode = true;
    this.skipEndOffset = endOffset;
  }

  private resetBacktickStrState() {
    this.backtickStrCount = 0;
    this.backtickStrBeginPoint = null;
    this.backtickStrEndPoint = null;
  }

  private resetReadModeState() {
    this.readMode = false;
    this.activeNode = null;
    this.onlySpaceChars = true;
  }

  private resetSkipModeState() {
    this.skipMode = false;
    this.skipBeginOffset = 0;
    this.skipEndOffset = 0;
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState): BuildCommand {
    if (this.readMode) {
      const offsetDiff = this.endBacktickOffset - position.start.offset;
      if (offsetDiff > 0) {
        // [TODO]: the line endings contain \r\n, which is ignored here.
        const isLastChar = offsetDiff === 1;
        const charToAppend = (ch === '\n' || ch === '\r') ? ' ' : ch;
        this.onlySpaceChars = this.onlySpaceChars && ch === ' ';

        if (!state.dryRun) {
          if (isLastChar && !this.onlySpaceChars && ch === ' ' && this.activeNode.value.startsWith(' ')) {
            this.activeNode.value = this.activeNode.value.slice(1);
          } else {
            this.activeNode.value += charToAppend;
          }
        }

        return { use: true };
      } else {
        this.resetReadModeState();
        return { use: true, moveTo: this.endBacktickEndPoint };
      }
    }

    if (this.skipMode) {
      if (position.start.offset < this.skipEndOffset) {
        return { use: this.codeActive ? true : false };
      }
      this.resetSkipModeState(); // and then continue
    }

    const createAndFillCodeSpanNode = () => {
      if (!state.dryRun) {
        this.activeNode = new CodeSpanNode(position);
        currentNode.appendChild(this.activeNode);
      }

      this.readMode = true;
      this.endBacktickOffset = this.backtickStrBeginPoint.offset;
      this.endBacktickEndPoint = position.start;

      this.codeActive = false;
      this.resetBacktickStrState();
      return { use: true, moveTo: this.codeValuePoint };
    }

    if (ch === '`') {
      if (this.backtickStrCount) {
        this.backtickStrCount++;
      } else {
        this.backtickStrCount = 1;
        this.backtickStrBeginPoint = position.start;
      }
      return { use: true };
    }

    if (ch === '\0') {
      if (this.backtickStrCount > 0 && this.codeActive) {
        if (this.beginBacktickCount === this.backtickStrCount) {
          return createAndFillCodeSpanNode();
        } else {
          this.activateSkipMode(this.codeValuePoint.offset);
          this.resetBacktickStrState();
          this.codeActive = false;
          return { use: true, moveTo: this.beginBacktickPoint };
        }
      } else if (this.backtickStrCount > 0) {
        this.activateSkipMode(position.start.offset);
        const skipBeginPoint = this.backtickStrBeginPoint;
        this.resetBacktickStrState();
        return { use: true, moveTo: skipBeginPoint };
      } else if (this.codeActive) {
        this.activateSkipMode(this.codeValuePoint.offset);
        // this.resetBacktickStrState();
        this.codeActive = false;
        return { use: true, moveTo: this.beginBacktickPoint };
      } else {
        return;
      }
    }

    // not a backtick char
    if (this.backtickStrCount > 0 && this.codeActive){
      if (this.beginBacktickCount === this.backtickStrCount) {
        return createAndFillCodeSpanNode();
      } else {
        this.activateSkipMode(position.start.offset);
        const skipBeginPoint = this.backtickStrBeginPoint;
        this.resetBacktickStrState();
        return { use: true, moveTo: skipBeginPoint };
      }
    } else if (this.backtickStrCount > 0) {
      this.beginBacktickCount = this.backtickStrCount;
      this.beginBacktickPoint = this.backtickStrBeginPoint;
      this.codeValuePoint = position.start;
      this.codeActive = true;
      this.resetBacktickStrState();
      return { use: true };
    } else if (this.codeActive) {
      return { use: true };
    } else {
      return;
    }
  }
}
