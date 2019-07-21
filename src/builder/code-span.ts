import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position } from '../utils';
import Node, { CodeSpanNode } from '../nodes';

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

  feed(ch: string, position: Position, currentNode: Node) {
    if (this.readMode) {
      const offsetDiff = this.endBacktickOffset - position.start.offset;
      if (offsetDiff > 0) {
        this.readCode(ch, offsetDiff === 1);
        return BUILD_MSG_TYPE.USE;
      } else {
        this.resetReadModeState();
        return [
          BUILD_MSG_TYPE.USE,
          { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.endBacktickEndPoint },
        ];
      }
    }

    if (this.skipMode) {
      if (position.start.offset < this.skipEndOffset) {
        return this.codeActive ? BUILD_MSG_TYPE.USE : undefined;
      }
      this.resetSkipModeState(); // and then continue
    }

    const createAndFillCodeSpanNode = () => {
      this.activeNode = new CodeSpanNode(position);
      currentNode.appendChild(this.activeNode);

      this.readMode = true;
      this.endBacktickOffset = this.backtickStrBeginPoint.offset;
      this.endBacktickEndPoint = position.start;

      this.codeActive = false;
      this.resetBacktickStrState();
      return [
        BUILD_MSG_TYPE.USE,
        { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.codeValuePoint },
      ];
    }

    if (ch === '`') {
      if (this.backtickStrCount) {
        this.backtickStrCount++;
      } else {
        this.backtickStrCount = 1;
        this.backtickStrBeginPoint = position.start;
      }
      return BUILD_MSG_TYPE.USE;
    }

    if (ch === '\0') {
      if (this.backtickStrCount > 0 && this.codeActive) {
        if (this.beginBacktickCount === this.backtickStrCount) {
          return createAndFillCodeSpanNode();
        } else {
          this.activateSkipMode(this.codeValuePoint.offset);
          this.resetBacktickStrState();
          this.codeActive = false;
          return [
            BUILD_MSG_TYPE.USE,
            { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.beginBacktickPoint },
          ];
        }
      } else if (this.backtickStrCount > 0) {
        this.activateSkipMode(position.start.offset);
        const skipBeginPoint = this.backtickStrBeginPoint;
        this.resetBacktickStrState();
        return [
          BUILD_MSG_TYPE.USE,
          { type: BUILD_MSG_TYPE.MOVE_TO, payload: skipBeginPoint },
        ];
      } else if (this.codeActive) {
        this.activateSkipMode(this.codeValuePoint.offset);
        // this.resetBacktickStrState();
        this.codeActive = false;
        return [
          BUILD_MSG_TYPE.USE,
          { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.beginBacktickPoint },
        ];
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
        return [
          BUILD_MSG_TYPE.USE,
          { type: BUILD_MSG_TYPE.MOVE_TO, payload: skipBeginPoint },
        ];
      }
    } else if (this.backtickStrCount > 0) {
      this.beginBacktickCount = this.backtickStrCount;
      this.beginBacktickPoint = this.backtickStrBeginPoint;
      this.codeValuePoint = position.start;
      this.codeActive = true;
      this.resetBacktickStrState();
      return BUILD_MSG_TYPE.USE;
    } else if (this.codeActive) {
      return BUILD_MSG_TYPE.USE;
    } else {
      return;
    }
  }

  readCode(ch: string, isLastChar: boolean = false) {
    // [TODO]: the line endings contain \r\n, which is ignored here.
    if (ch === '\n' || ch === '\r') {
      ch = ' ';
    }
    this.onlySpaceChars = this.onlySpaceChars && ch === ' ';

    if (isLastChar && !this.onlySpaceChars && ch === ' ' && this.activeNode.value.startsWith(' ')) {
      this.activeNode.value = this.activeNode.value.slice(1);
    } else {
      this.activeNode.value += ch;
    }
  }
}


