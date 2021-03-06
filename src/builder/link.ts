import BaseBuilder from "./_base";
import { Position, Point, isASCIISpace, isASCIIControlChar, isWhitespaceChar, isEscapableChar } from "../utils";
import Node, { LinkNode } from "../nodes";
import { CustomEntityBuidler } from "./entity";
import { BuildCommand } from "../cmd";
import { entityUtils } from '../utils';

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
  private linkDestPointy: string = undefined;
  private linkDestClosed: boolean = false;
  private linkDestParenthesisLevel: number = 0;
  private linkTitle: string = '';
  private linkTitleSrc: string = '';
  private linkTitleType: string = undefined;
  private linkTitleClosed: boolean = false;
  private backslashEscapeActive: boolean = false;

  private entityBuilder: CustomEntityBuidler;

  constructor() {
    super();
    this.resetInnerState();
    this.entityBuilder = new CustomEntityBuidler();
  }

  private resetInnerState() {
    this.linkDest = '';
    this.linkDestPointy = undefined;
    this.linkDestParenthesisLevel = 0;
    this.linkDestClosed = false;
    this.linkTitle = '';
    this.linkTitleSrc = '';
    this.linkTitleType = undefined;
    this.linkTitleClosed = false;
    this.backslashEscapeActive = false;
  }

  // preFeed(ch: string, position: Position, currentNode: Node) {

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean): BuildCommand {
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
      return this.processLabel(ch, position, currentNode, innerEnd);
    }

    if (this.scanningStructure) {
      return this.scan(ch, position, currentNode);
    }

    if (ch === '[') {
      this.scanningStructure = true;
      this.bracketStack.push(position.start.offset);
      this.scanStartPoint = position.start;
      this.scanState = ScanState.Label;
      // enable dry-run mode, which means to parse code-span but insert no code-span node.
      return { use: true, dryRun: true };
    }
  }

  scan(ch: string, position: Position, currentNode: Node): BuildCommand {
    let matchFailMark: boolean = false;

    if (ch === '\0' && this.scanState !== ScanState.None) {
      matchFailMark = true;
    } else {
      switch (this.scanState) {
        case ScanState.Label:
          if (ch === '\\' && !this.backslashEscapeActive) {
            this.backslashEscapeActive = true;
            return { use: true }; // [TODO]
          }

          if (ch === '[' && !this.backslashEscapeActive) {
            this.bracketStack.push(position.start.offset);
            return { use: true };
          } else if (ch === ']' && !this.backslashEscapeActive) {
            this.scanState = ScanState.EndBracket;
            this.endBracketOffset = position.start.offset;
            return { use: true };
          }

          this.backslashEscapeActive = false;
          break;
        case ScanState.EndBracket:
          if (ch === '(') {
            this.scanState = ScanState.StartParenthesis;
            this.startBracketOffset = this.bracketStack.pop();
            return { use: true, dryRun: false };
          } else {
            // [TODO]: view the right bracket as a simple char
            this.bracketStack.pop();
            if (this.bracketStack.length === 0) {
              matchFailMark = true;
              break;
            }

            this.scanState = ScanState.Label;
            if (ch === '[') {
              this.bracketStack.push(position.start.offset);
              return { use: true }; // MSG_TYPE.SKIP_TEXT;
            } else if (ch === ']') {
              this.scanState = ScanState.EndBracket;
              this.endBracketOffset = position.start.offset;
              return { use: true };
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
            // assert this call doesn't return false (meeting an error)
            this.parseLinkDest(ch);
          }
          break;
        case ScanState.Dest:
          var ok = this.parseLinkDest(ch);
          if (!ok) {
            if (isWhitespaceChar(ch)) {
              this.scanState = ScanState.SpacesBetween;
            } else if (ch === ')') {
              this.scanState = ScanState.EndParenthesis;
            } else {
              matchFailMark = true;
            }
          }
          break;
        case ScanState.SpacesBetween:
          if (ch === ')') {
            this.scanState = ScanState.EndParenthesis;
          } else if (!isWhitespaceChar(ch)) {
            this.scanState = ScanState.Title;
            const ok = this.parseLinkTitle(ch);
            if (ok === false) matchFailMark = true;
          }
          break;
        case ScanState.Title:
          var ok = this.parseLinkTitle(ch);
          if (!ok) {
            if (ch === ')') {
              this.scanState = ScanState.EndParenthesis;
            } else if (isWhitespaceChar(ch)) {
              this.scanState = ScanState.SpacesBeforeEndParenthesis;
            } else {
              matchFailMark = true;
            }
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
    }

    if (matchFailMark) {
      this.resetInnerState();
      this.scanEndPoint = position.start;
      this.scanningStructure = false;

      this.endBypassOffset = position.start.offset;
      this.startBypassOffset = this.scanStartPoint.offset;

      return { use: true, moveTo: this.scanStartPoint, dryRun: false };
    }

    if (this.scanState === ScanState.EndParenthesis) {
      const node = new LinkNode(position);
      node.dest = entityUtils.decodeHTMLStrict(this.linkDest);
      node.title = this.linkTitle; // entityUtils.decodeHTMLStrict(this.linkTitleSrc);
      this.nodeToAppend = node;
      this.scanningStructure = this.processingLabel = true;
      this.scanEndPoint = position.start;

      this.resetInnerState();
      return { use: true, moveTo: this.scanStartPoint, dryRun: false };
    }

    return { use: true };
  }

  processLabel(ch: string, position: Position, currentNode: Node, innerEnd: boolean): BuildCommand {
    const currentOffset = position.start.offset;

    if (currentOffset < this.startBracketOffset) {
      return undefined; // do nothing
    }

    if (currentOffset === this.startBracketOffset) {
      const node = this.nodeToAppend;
      currentNode.appendChild(node);
      this.activeNode = node;
      return { use: true, node };
    }

    if (currentOffset === this.endBracketOffset) {
      if (currentNode === this.activeNode && innerEnd) {
        return {
          use: true,
          end: false,
          node: currentNode.parentNode,
          moveTo: this.scanEndPoint,
        };
      } else {
        return { requestCloseNode: true };
      }
    }

    if (currentOffset > this.endBracketOffset) { // )
      this.processingLabel = false;
      this.scanningStructure = false;
      return { use: true };
    }
  }

  /**
   * accept a single char in link dest and returns the next parsing result
   * @param ch the input character
   * @returns {boolean} whether d (=true) or  (=false)
   *
   * returns true when ch is acceptable
   * returns false when ch is an illegal character
   */
  parseLinkDest(ch: string): boolean {
    if (this.linkDestClosed) return false;

    if (this.linkDest === '' && this.linkDestPointy === undefined) {
      if (ch === '<') {
        this.linkDestPointy = '<';
        return true;
      } else {
        this.linkDestPointy = '';
      }
    }

    if (ch === '\\' && !this.backslashEscapeActive) {
      this.backslashEscapeActive = true;
      return true;
    }

    if (this.linkDestPointy === '<') {
      if (ch === '>' && !this.backslashEscapeActive) {
        this.linkDestClosed = true;
        return true;
      }
      if (ch === '\n') return false; // [TODO]
      this.linkDest += this.backslashEscapeActive && !isEscapableChar(ch) ? '\\' : '' + ch;
      this.backslashEscapeActive = false;
      return true;
    }

    // the link dest with no pointy-style
    if (isASCIISpace(ch) || isASCIIControlChar(ch)) {
      return this.linkDestParenthesisLevel ? true : false;
    } else if (ch === '(' && !this.backslashEscapeActive) {
      this.linkDestParenthesisLevel++;
    } else if (ch === ')' && !this.backslashEscapeActive) {
      if (this.linkDestParenthesisLevel === 0) return false;
      this.linkDestParenthesisLevel--;
    }
    this.linkDest += (this.backslashEscapeActive && !isEscapableChar(ch) ? '\\' : '') + ch;
    this.backslashEscapeActive = false;
    return true;
  }

  parseLinkTitle(ch: string): boolean {
    // a closed title accepts no more characters.
    if (this.linkTitleClosed) return false;

    // decide the type from the first character
    if (this.linkTitle === '' && this.linkTitleType === undefined) {
      if (ch !== '(' && ch !== '"' && ch !== '\'') return false;
      this.linkTitleType = ch;
      return true;
    }

    // any unescaped '(' is not acceptable
    const pre = this.linkTitleType;
    if (pre === '(' && ch === '(' && !this.backslashEscapeActive) return false;

    // process character
    this.linkTitleSrc += ch;
    const srcLen = this.linkTitleSrc.length;
    this.entityBuilder.appendChar = (ch: string) => {
      this.linkTitle += ch;
    }

    for (let offset = srcLen - 1; offset < srcLen;) {
      const ch = this.linkTitleSrc.charAt(offset);

      // activate backslash escape state
      if (ch === '\\' && !this.backslashEscapeActive) {
        this.backslashEscapeActive = true;
        offset++;
        continue;
      }

      // whether meeting the ending
      if (!this.backslashEscapeActive && (pre === '"' && ch === '"' || pre === '\'' && ch === '\'' || pre === '(' && ch === ')')) {
        const cmd = this.entityBuilder.feed('\0', offsetToPosition(srcLen), null);
        if (cmd && cmd.use) {
          offset = cmd && cmd.moveTo ? cmd.moveTo.offset : offset + 1;
          this.backslashEscapeActive = false;
          continue;
        } else {
          this.backslashEscapeActive = false;
          this.linkTitleClosed = true;
          return true;
        }
      } else {
        const cmd = this.entityBuilder.feed(ch, offsetToPosition(offset), null);
        if (cmd && cmd.use) {
          // keep silent
        } else {
          this.linkTitle += (this.backslashEscapeActive && !isEscapableChar(ch) ? '\\' : '') + ch;
        }
        offset = cmd && cmd.moveTo ? cmd.moveTo.offset : offset + 1;
        this.backslashEscapeActive = false;
      }
    }

    // this.backslashEscapeActive = false;
    return true;
  }
}


/* utils */

function offsetToPosition(offset: number) {
  return new Position(new Point(1, 1, offset));
}


