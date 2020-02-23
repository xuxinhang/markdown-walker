import { Token, BuildState, BuildCommand, TokenTypes } from "../cmd";
import BaseBuilder from "./_base";
import { Position, isLeftFlankingDelimiterRun, isRightFlankingDelimiterRun, findParentNode, yankChildNode, moveAllChildren } from "../utils";
import { Node, MarkNode } from "../nodes";

const MARK_PRECEDENCE = 3;
const BUILDER_ID = 'mark';


export default class MarkBuilder extends BaseBuilder {
  private bulletCount: number;
  private bulletPrecededChar: string;
  private bulletFollowedChar: string;
  // private bulletOpened: boolean;

  constructor() {
    super();
    this.resetInner();
  }

  private resetInner() {
    this.bulletCount = 0;
    this.bulletPrecededChar = '';
    this.bulletFollowedChar = '';
    this.bulletOpened = false;
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState, token: Token): BuildCommand {
    // if (token.type !== TokenTypes.NextChar) return;

    if (token.type === TokenTypes.NextChar) {
      ch = token.payload.char;
    } else {
      ch = '\0';
    }

    if (token.type === TokenTypes.RequestClose) {
      if (currentNode instanceof MarkNode && token.payload.source !== 'mark') {
        const openBulletCount = currentNode.bulletCount;
        const parentNode = currentNode.parentNode;
        if (openBulletCount)
          currentNode.insertTextBefore(currentNode.firstChild, '='.repeat(openBulletCount), position);
        yankChildNode(currentNode);
        return { node: parentNode };
      }
      return;
    }

    if (ch === '=') {
      if (this.bulletCount) {
        this.bulletCount++;
      } else {
        this.bulletCount = 1;
        // this.bulletPoint
      }
      return { use: true };
    }

    // if ch is not '=' and there are leading '='
    if (this.bulletCount) {
      this.bulletFollowedChar = ch;
      const canOpenNode  = isLeftFlankingDelimiterRun(this.bulletPrecededChar, this.bulletFollowedChar);
      const canCloseNode = isRightFlankingDelimiterRun(this.bulletPrecededChar, this.bulletFollowedChar);

      let restBulletCount = this.bulletCount;

      while (canCloseNode && restBulletCount >= 2) {
        const nearestNode = findParentNode(currentNode, n => (n instanceof MarkNode));
        if (!nearestNode) break;

        if (!(currentNode instanceof MarkNode)) {
          state.requestClose(MARK_PRECEDENCE, BUILDER_ID);
          return;
        }

        let openBulletCount = currentNode.bulletCount; // the char number of the open bullet run

        if (openBulletCount >= 2) {
          const isolatedNode = new MarkNode(position);
          moveAllChildren(currentNode, isolatedNode);
          currentNode.appendChild(isolatedNode);

          openBulletCount -= 2;
          restBulletCount -= 2;
          currentNode.bulletCount = openBulletCount;
        }

        if (openBulletCount < 2) {
          if (openBulletCount)
            currentNode.insertTextBefore(currentNode.firstChild, '='.repeat(openBulletCount), position);
          const parentNode = currentNode.parentNode;
          yankChildNode(currentNode);
          openBulletCount = 0;
          restBulletCount -= openBulletCount;
          currentNode = parentNode;
        }
      }

      if (canOpenNode && restBulletCount >= 2) {
        const node = new MarkNode(position);
        node.bulletCount = restBulletCount;
        currentNode.appendChild(node);
        currentNode = node;
      } else {
        if (restBulletCount)
          currentNode.appendText('='.repeat(restBulletCount), position);
        restBulletCount = 0;
      }
    }

    this.resetInner();
    this.bulletPrecededChar = ch;

    return { node: currentNode };
  }
}














