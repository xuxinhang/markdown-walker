import BaseBuilder from './_base';
import { Point, Position } from '../utils';
import Node, { CodeSpanNode } from '../nodes';
import { BuildState, BuildCommand, Token, TokenTypes } from '../cmd';

export default class CodeSpanBuilder extends BaseBuilder {
  backtickRunCount: number;
  backtickRunBeginPoint: Point;
  backtickRunEndPoint: Point;
  codeSpanContentCache: string;

  codeSpanActive: boolean;
  backtickBeginRunCount: number;
  backtickBeginRunPoint: Point;
  codeValuePoint: Point;
  backtickEndRunPoint: Point;
  backtickEndRunOffset: number;

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
    this.codeSpanActive = false;
    this.backtickBeginRunPoint = null;
    this.backtickBeginRunCount = 0;
    this.codeSpanContentCache = '';
    this.codeValuePoint = null;
    this.backtickEndRunPoint = null;
    this.backtickEndRunOffset = -1;
    this.backtickEndRunPoint = null;

    this.resetBacktickRunState();
    this.resetSkipModeState();
    this.resetReadModeState();
  }

  private activateSkipMode(endOffset: number) {
    this.skipMode = true;
    this.skipEndOffset = endOffset;
  }

  private resetBacktickRunState() {
    this.backtickRunCount = 0;
    this.backtickRunBeginPoint = null;
    this.backtickRunEndPoint = null;
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

  private appendToContentCache (ch) {
    this.codeSpanContentCache += ch;
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState, token: Token): BuildCommand {
    ch = token.type === TokenTypes.NextChar ? token.payload.char : '\0';

    if (this.readMode) {
      const offsetDiff = this.backtickEndRunOffset - position.start.offset;
      if (offsetDiff > 0) {
        // [TODO]: the line endings contain \r\n, which is ignored here.
        const isLastChar = offsetDiff === 1;
        const charToAppend = (ch === '\n' || ch === '\r') ? ' ' : ch;
        this.onlySpaceChars = this.onlySpaceChars && ch === ' ';

        if (!state.dryRun) {
          if ((isLastChar && charToAppend === ' ') &&
            !this.onlySpaceChars &&
            this.activeNode.value.startsWith(' ')
          ) {
            this.activeNode.value = this.activeNode.value.slice(1);
          } else {
            this.activeNode.value += charToAppend;
          }
        }

        return { use: true };
      } else {
        this.resetReadModeState();
        return { use: true, moveTo: this.backtickEndRunPoint, monopoly: false };
      }
    }

    if (this.skipMode) {
      if (position.start.offset < this.skipEndOffset) {
        return { use: this.codeSpanActive ? true : false };
      }
      this.resetSkipModeState(); // and then continue
    }

    const createAndFillCodeSpanNode = () => {
      if (!state.dryRun) {
        this.activeNode = new CodeSpanNode(position);
        currentNode.appendChild(this.activeNode);
      }

      this.readMode = true;
      this.backtickEndRunOffset = this.backtickRunBeginPoint.offset;
      this.backtickEndRunPoint = position.start;

      this.codeSpanActive = false;
      this.resetBacktickRunState();
      return { use: true, moveTo: this.codeValuePoint };
    }

    const createCodeSpanNodeUsingContent = (content: string) => {
      const node = new CodeSpanNode(position);
      currentNode.appendChild(node);
      node.value = content;
    }

    // Never accept RequestClose Token
    // if (token.type === TokenTypes.RequestClose) { ...

    if (ch === '\0') {
      if (this.backtickRunCount > 0 && this.codeSpanActive) {
        if (this.backtickBeginRunCount === this.backtickRunCount) {
          return createAndFillCodeSpanNode();
        } else {
          this.activateSkipMode(this.codeValuePoint.offset);
          this.codeSpanActive = false;
          this.resetBacktickRunState();
          return { use: true, moveTo: this.backtickBeginRunPoint, monopoly: false };
        }
      } else if (this.backtickRunCount > 0) {
        this.activateSkipMode(position.start.offset);
        const skipBeginPoint = this.backtickRunBeginPoint;
        this.resetBacktickRunState();
        return { use: true, moveTo: skipBeginPoint, monopoly: false };
      } else if (this.codeSpanActive) {
        this.activateSkipMode(this.codeValuePoint.offset);
        this.codeSpanActive = false;
        return { use: true, moveTo: this.backtickBeginRunPoint, monopoly: false };
      } else {
        return;
      }
    }

    if (ch === '`') {
      if (this.backtickRunCount) {
        this.backtickRunCount++;
        return { use: true };
      } else {
        this.backtickRunCount = 1;
        this.backtickRunBeginPoint = position.start;
        return { use: true, monopoly: true };
      }
    }

    // not a backtick char
    if (this.backtickRunCount > 0) {
      if (this.codeSpanActive) {
        // the char number of the begin run is equal to that of the end run
        if (this.backtickBeginRunCount === this.backtickRunCount) {
          createCodeSpanNodeUsingContent(this.codeSpanContentCache);

          this.codeSpanActive = false;
          this.resetBacktickRunState();

          return { monopoly: false };
          // return createAndFillCodeSpanNode();
        } else {
          this.activateSkipMode(position.start.offset);
          const skipBeginPoint = this.backtickRunBeginPoint;
          this.resetBacktickRunState();
          return { use: true, moveTo: skipBeginPoint, monopoly: false };
        }
      } else {
        this.backtickBeginRunCount = this.backtickRunCount;
        this.backtickBeginRunPoint = this.backtickRunBeginPoint;
        this.codeValuePoint = position.start;
        this.codeSpanActive = true;
        this.resetBacktickRunState();
        this.appendToContentCache(ch);
        return { use: true };
      }
    } else {
      if (this.codeSpanActive) {
        this.appendToContentCache(ch);
        return { use: true };
      } else {
        return;
      }
    }
  }
}
