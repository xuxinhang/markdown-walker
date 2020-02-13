import BaseBuilder from "./_base";
import {
  Point, Position,
  isRightFlankingDelimiterRun, isLeftFlankingDelimiterRun, findParentNode, yankChildNode,
} from "../utils";
import { Node, TextNode, StrikeNode } from '../nodes';
import { BuildState, BuildCommand, Token, TokenTypes } from "../cmd";

const STRIKE_PRECEDENCE = 3;

interface BulletItem {
  count: number;
  point: Point;
  precededChar: string;
  followedChar: string;
  nodeChildLength: number;
}

export default class StrikeBuilder extends BaseBuilder {
  private bulletOpened: boolean;
  private bulletCount: number;
  private bulletPoint: Point;
  private bulletPrecededChar: string;
  private bulletFollowedChar: string;

  // private bulletStack: Array<BulletItem>;

  constructor() {
    super();
    this.resetInner();
  }

  private resetInner() {
    this.bulletOpened = false;
    this.bulletCount = 0;
    this.bulletPoint = null;
    this.bulletPrecededChar = '';
    this.bulletFollowedChar = '';
    // this.bulletStack = [];
  }

  private resetBullet() {
    this.bulletCount = 0;
    this.bulletPoint = null;
    this.bulletPrecededChar = '';
    this.bulletFollowedChar = '';
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState, token: Token): BuildCommand {
    // if the char is ~
    if (ch === '~') {
      if (this.bulletCount) {
        this.bulletCount++;
      } else {
        this.bulletCount = 1;
        this.bulletPoint = position.start;
      }
      return { use: true };
    }

    // if ch is not "~" and there are the leading '~'
    if (this.bulletCount) {
      this.bulletFollowedChar = ch;
      let restBulletCount = this.bulletCount;

      const leftFlanking = isLeftFlankingDelimiterRun(this.bulletPrecededChar, this.bulletFollowedChar);
      const rightFlanking = isRightFlankingDelimiterRun(this.bulletPrecededChar, this.bulletFollowedChar);
      const canOpenStrike = leftFlanking;
      const canCloseStrike = rightFlanking;

      while (canCloseStrike && restBulletCount >= 2) {
        let nearestStrikeNode = findParentNode(currentNode, n => (n instanceof StrikeNode));
        if (!nearestStrikeNode) break;

        if (!(currentNode instanceof StrikeNode)) {
          state.requestClose(STRIKE_PRECEDENCE);
          return;
        }

        // const prevBullet = this.bulletStack[this.bulletStack.length - 1];
        let prevBulletCount = currentNode.bulletCount;
        if (prevBulletCount < 2) {
          if (prevBulletCount > 0) {
            // add the character before the node
            const text = '~'.repeat(prevBulletCount);
            currentNode.insertTextBefore(currentNode.firstChild, text, position);
            // remove the empty node
            // const parent = currentNode.parentNode;
            // for (let child of currentNode.children) parent.insertBefore(child, currentNode);
            // parent.removeChild(currentNode);
            yankChildNode(currentNode);
          }
          // this.bulletStack.pop();
          state.cancelFocus();
          continue;
        }

        // else, minus bullet counter and jump to parent node
        prevBulletCount -= 2;
        restBulletCount -= 2;

        currentNode.bulletCount = prevBulletCount;
        currentNode = currentNode.parentNode;
      }

      if (canOpenStrike && restBulletCount >= 2) {
        if (currentNode.lastChild instanceof TextNode) {
          currentNode.lastChild.allowAppendText = false;
        }

        // this.bulletStack.push({
        //   count: restBulletCount,
        //   point: this.bulletPoint,
        //   precededChar: this.bulletPrecededChar,
        //   followedChar: this.bulletFollowedChar,
        //   nodeChildLength: currentNode.children.length,
        // });

        // append strike node
        const node = new StrikeNode(position);
        node.bulletCount = restBulletCount;
        // node.precededChar = this.bulletPrecededChar;
        // node.followedChar = this.bulletFollowedChar;
        currentNode.appendChild(node);
        currentNode = node;
        state.focus();

      } else {
        if (restBulletCount > 0) {
          currentNode.appendText('~'.repeat(restBulletCount), position);
        }
        restBulletCount = 0;
      }
    }

    // update the inner states and counters
    this.resetBullet();
    this.bulletPrecededChar = ch;

    // if there is a close request ...
    const haveToClose = ch === '\0' || token && token.type === TokenTypes.RequestClose;
    if (haveToClose && (currentNode instanceof StrikeNode)) {
      const prevBulletCount = currentNode.bulletCount;
      const parent = currentNode.parentNode;
      if (prevBulletCount > 0) {
        parent.insertTextBefore(currentNode, '~'.repeat(prevBulletCount), position);
        yankChildNode(currentNode);
        // const refNode = currentNode.children[prevBullet.nodeChildLength];
        // currentNode.insertTextBefore(refNode, '~'.repeat(prevBulletCount), position);
      }
      currentNode = parent;
      // this.bulletStack.pop();
      state.cancelFocus();
    }

    return {
      // focus: true,
      // use: true,
      // moveBy: false,
      node: currentNode,
    };
  }
}
