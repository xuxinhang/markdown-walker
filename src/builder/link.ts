import BaseBuilder, { BuildCmd } from "./_base";
import { Position, Point, isASCIISpace, isASCIIControlChar, isWhitespaceChar } from "../utils";
import Node, { LinkNode } from "../nodes";
import { BUILD_MSG_TYPE } from ".";

enum ScanState {
  None,
  StartBracket,
  Label,
  EndBracket,
  StartParenthesis,
  SpacesAfterStartParenthesis,
  Dest,
  SpacesBetween,
  Title,
  SpacesBeforeEndParenthesis,
  EndParenthesis,
};

export default class LinkBuilder extends BaseBuilder {
  private processingLabel: boolean = false;
  private scanningStructure: boolean = false;
  // private metaContent: string = '';

  private bracketStack: number[] = [];
  private startBracketOffset: number = 0;
  private endBracketOffset: number = 0;
  private scanStartPoint: Point = null;
  private scanEndPoint: Point = null;
  private nodeToAppend: Node = null;
  private activeNode: Node = null;

  private startBypassOffset: number = undefined;
  private endBypassOffset: number = undefined;

  private scanState: ScanState = ScanState.None;

  // for parsing functions
  private linkDest: string = '';
  private linkDestPointy: boolean = false;
  private linkDestParenthesisLevel: number = 0;
  private linkTitle: string = '';
  private linkTitleType: string = '';
  private linkTitleClosed: boolean = false;


  constructor() {
    super();
    this.resetInnerState();
  }

  private resetInnerState() {
    this.linkDest = '';
    this.linkDestPointy = false;
    this.linkDestParenthesisLevel = 0;
    this.linkTitle = '';
    this.linkTitleType = '';
    this.linkTitleClosed = false;
  }

  feed(ch: string, position: Position, currentNode: Node): BuildCmd {
    // It's necessary to scan ahead the string to determinate whether it is a valid link node,
    // because builders need to re-run from the beginning after finding the previously created
    // node invalid, which might cause redundant parsing process.

    if (this.endBypassOffset !== undefined) {
      if (position.start.offset <= this.endBypassOffset) {
        return undefined;
      } else {
        this.startBypassOffset = this.endBypassOffset = undefined;
      }
    }

    if (this.processingLabel) {
      return this.processLabel(ch, position, currentNode);
    }

    if (this.scanningStructure) {
      return this.scan(ch, position, currentNode);
    }

    if (ch === '[') {
      this.scanningStructure = true;
      this.bracketStack.push(position.start.offset);
      this.scanStartPoint = position.start;
      this.scanState = ScanState.Label;
      return BUILD_MSG_TYPE.USE;
    }
  }

  scan(ch: string, position: Position, currentNode: Node): BuildCmd {
    let matchFailMark: boolean = false;

    switch (this.scanState) {
      case ScanState.Label:
        if (ch === '[') {
          this.bracketStack.push(position.start.offset);
          return BUILD_MSG_TYPE.SKIP_TEXT;
        } else if (ch === ']') {
          this.scanState = ScanState.EndBracket;
          this.endBracketOffset = position.start.offset;
          return BUILD_MSG_TYPE.USE;
        }
        break;
      case ScanState.EndBracket:
        if (ch === '(') {
          this.scanState = ScanState.StartParenthesis;
          this.startBracketOffset = this.bracketStack.pop();
        } else {
          // [TODO] view the right bracket as a simple char
          this.bracketStack.pop();
          if (this.bracketStack.length === 0) {
            matchFailMark = true;
            // return { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanStartPoint };
          }
        }
        break;
      case ScanState.StartParenthesis:
        if (isWhitespaceChar(ch)) {
          this.scanState = ScanState.SpacesAfterStartParenthesis;
        } else if (ch === ')') {
          this.scanState = ScanState.EndParenthesis;
        } else {
          this.scanState = ScanState.Dest;
          if (this.parseLinkDest(ch) === false) {
            matchFailMark = true;
          }
        }
        break;
      case ScanState.SpacesAfterStartParenthesis:
        if (ch === ')') {
          this.scanState = ScanState.EndParenthesis;
        } else if (!isWhitespaceChar(ch)) {
          this.scanState = ScanState.Dest;
          this.parseLinkDest(ch);
        }
        break;
      case ScanState.Dest:
        if (this.linkDestParenthesisLevel === 0 && ch === ')') {
          this.scanState = ScanState.EndParenthesis;
        }

        var ok = this.parseLinkDest(ch);
        if (ok === false) {
          if (isWhitespaceChar(ch)) {
            this.scanState = ScanState.SpacesBetween;
          }
        } else if (ok === true) {
          if (isWhitespaceChar(ch)) {
            this.scanState = ScanState.SpacesBetween;
          }
        }
        break;
      case ScanState.SpacesBetween:
        if (ch === ')') {
          this.scanState = ScanState.EndParenthesis;
        } else if (!isWhitespaceChar(ch)) {
          this.scanState = ScanState.Title;
          this.parseLinkTitle(ch);
        }
        break;
      case ScanState.Title:
        if (this.linkTitleClosed) {
          if (ch === ')') {
            this.scanState = ScanState.EndParenthesis;
          } else if (isWhitespaceChar(ch)) {
            this.scanState = ScanState.SpacesBeforeEndParenthesis;
          } else {
            matchFailMark = true;
          }
        } else {
          var ok = this.parseLinkTitle(ch);
          if (ok === true) this.linkTitleClosed = true;
        }
        break;
      case ScanState.SpacesBeforeEndParenthesis:
        if (ch === ')') {
          this.scanState = ScanState.EndParenthesis;
        } else if (!isWhitespaceChar(ch)) {
          matchFailMark = true;
        }
        break;
      default:
    }

    if (matchFailMark) {
      this.resetInnerState();
      this.scanEndPoint = position.start;
      this.scanningStructure = false;

      this.endBypassOffset = position.start.offset;
      this.startBypassOffset = this.scanStartPoint.offset;

      return [
        BUILD_MSG_TYPE.USE,
        { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanStartPoint },
      ];
    }

    if (this.scanState === ScanState.EndParenthesis) {
      const node = new LinkNode(position);
      node.dest = this.linkDest;
      node.title = this.linkTitle;
      this.nodeToAppend = node;
      this.scanningStructure = this.processingLabel = true;
      this.scanEndPoint = position.start;

      this.resetInnerState();
      return [
        BUILD_MSG_TYPE.USE,
        { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanStartPoint },
      ];
    }

    return BUILD_MSG_TYPE.USE;

    /* if (this.scanState >= ScanState.StartParenthesis) {
      if (ch === ')') {
        // parse meta content
        const node = new LinkNode(position);
        node.dest = this.metaContent;
        this.nodeToAppend = node;
        this.processingLabel = true;
        this.scanEndPoint = position.start;
        return [
          BUILD_MSG_TYPE.USE,
          { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanStartPoint },
        ];
      } else {
        this.metaContent += ch;
        return BUILD_MSG_TYPE.USE;
      }
    } */
  }

  processLabel(ch: string, position: Position, currentNode: Node): BuildCmd {
    const currentOffset = position.start.offset;

    if (currentOffset < this.startBracketOffset) {
      return undefined; // do nothing
    }

    if (currentOffset === this.startBracketOffset) {
      const node = this.nodeToAppend;
      currentNode.appendChild(node);
      this.activeNode = node;
      return [
        BUILD_MSG_TYPE.USE,
        { type: BUILD_MSG_TYPE.OPEN_NODE, payload: node },
      ];
    }

    if (currentOffset === this.endBracketOffset) {
      if (currentNode === this.activeNode) {
        return [
          BUILD_MSG_TYPE.USE,
          { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode.parentNode },
          { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanEndPoint },
        ];
      } else {
        return [
          BUILD_MSG_TYPE.REQUEST_CLOSE_NODE,
        ];
      }
    }

    if (currentOffset > this.endBracketOffset) { // )
      this.processingLabel = false;
      this.scanningStructure = false;
      return BUILD_MSG_TYPE.USE;
    }
  }

  parseLinkDest(ch: string): boolean {
    if (this.linkDest === '') {
      if (ch === '<') {
        this.linkDestPointy = true;
        return undefined;
      }
    }

    if (this.linkDestPointy && false) {

    } else {
      if (isASCIISpace(ch) || isASCIIControlChar(ch)) {
        if (this.linkDestParenthesisLevel) {
          return true;
        } else {
          return false;
        }
      } else if (ch === '(') {
        this.linkDestParenthesisLevel++;
      } else if (ch === ')') {
        if (this.linkDestParenthesisLevel === 0) {
          return true;
        } else {
          this.linkDestParenthesisLevel--;
        }
      }
      this.linkDest += ch;
    }

    return undefined;
  }

  parseLinkTitle(ch: string): boolean {
    if (this.linkTitle === '' && this.linkTitleType === '') {
      if (ch !== '(' && ch !== '"' && ch !== '\'') return false;
      this.linkTitleType = ch;
      return undefined;
    } else {
      switch (this.linkTitleType) {
        case '"':
          if (ch === '"') return true;
          break;
        case '\'':
          if (ch === '\'') return true;
          break;
        case '(':
          if (ch === ')') return true;
          break;
      }
      this.linkTitle += ch;
      return undefined;
    }
  }
}



