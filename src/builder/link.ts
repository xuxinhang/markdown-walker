import BaseBuilder, { BuildCmd } from "./_base";
import { Position, Point } from "../utils";
import Node, { LinkNode } from "../nodes";
import { BUILD_MSG_TYPE } from ".";


export default class LinkBuilder extends BaseBuilder {
  private expectOpenParen: boolean = false;
  private scanningParenContent: boolean = false;
  private scanningStructure: boolean = false;
  private scanningMeta: boolean = false;
  private metaContent: string = '';

  private bracketStack: number[] = [];
  private startBracketOffset: number = 0;
  private endBracketOffset: number = 0;
  private scanStartPoint: Point = null;
  private scanEndPoint: Point = null;
  private nodeToAppend: Node = null;
  private activeNode: Node = null;

  private processInline: boolean = false;

  constructor() {
    super();
  }

  feed(ch: string, position: Position, currentNode: Node): BuildCmd {
    // It's necessary to scan ahead the string to determinate whether it is a valid link node,
    // because builders need to re-run from the beginning after finding the previously created
    // node invalid, which might cause redundant parsing process.

    if (this.processInline) {
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

      if (currentOffset > this.endBracketOffset) {
        this.processInline = false;
        this.scanningStructure = false;
        return BUILD_MSG_TYPE.USE;
      }

    } else {
      if (this.scanningStructure) {
        if (ch === '[') {
          this.bracketStack.push(position.start.offset);
          return BUILD_MSG_TYPE.SKIP_TEXT;
        }

        if (ch === ']') {
          this.expectOpenParen = true;
          return BUILD_MSG_TYPE.USE;
        }

        if (this.expectOpenParen) {
          if (ch === '(') {
            this.scanningMeta = true;
            this.expectOpenParen = false;
            this.startBracketOffset = this.bracketStack.pop();
            this.endBracketOffset = position.start.offset - 1;
          } else {
            // fail
            // view the right bracket as a simple char
            this.bracketStack.pop();
            if (this.bracketStack.length === 0) {
              return { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanStartPoint };
            }
          }
          return BUILD_MSG_TYPE.USE;
        }

        if (this.scanningMeta) {
          if (ch === ')') {
            this.scanningMeta = false;
            // parse meta content
            // create link node
            const node = new LinkNode(position);
            node.dest = this.metaContent;
            this.nodeToAppend = node;
            this.processInline = true;
            this.scanEndPoint = position.start;
            // currentNode.appendChild(node);
            return [
              BUILD_MSG_TYPE.USE,
              { type: BUILD_MSG_TYPE.MOVE_TO, payload: this.scanStartPoint },
            ];
          } else {
            this.metaContent += ch;
            return BUILD_MSG_TYPE.USE;
          }
        }

        return BUILD_MSG_TYPE.USE;
      }

      if (ch === '[') {
        this.scanningStructure = true;
        this.bracketStack.push(position.start.offset);
        this.scanStartPoint = position.start;
        return BUILD_MSG_TYPE.SKIP_TEXT;
      }
    }
  }
}


