import BaseBuilder from "./_base";
import {
  Point, Position,
  isRightFlankingDelimiterRun, isLeftFlankingDelimiterRun,
} from "../utils";
import { Node, TextNode, StrikeNode } from '../nodes';
import { BuildState, BuildCommand } from "../cmd";

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

  private bulletStack: Array<BulletItem>;

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
    this.bulletStack = [];
  }

  private resetBullet() {
    this.bulletCount = 0;
    this.bulletPoint = null;
    this.bulletPrecededChar = '';
    this.bulletFollowedChar = '';
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState): BuildCommand {
    if (ch === '~') {
      if (this.bulletCount) {
        this.bulletCount++;
      } else {
        this.bulletCount = 1;
        this.bulletPoint = position.start;
      }
      return { use: true };
    }

    // if ch is not "~"
    this.bulletFollowedChar = ch;
    const rec = state.focusRecords.last;


    let restBulletCount = this.bulletCount;

    const leftFlanking = isLeftFlankingDelimiterRun(this.bulletPrecededChar, this.bulletFollowedChar);
    const rightFlanking = isRightFlankingDelimiterRun(this.bulletPrecededChar, this.bulletFollowedChar);
    const canOpenStrike = leftFlanking;
    const canCloseStrike = rightFlanking;

    while (canCloseStrike && restBulletCount >= 2 && this.bulletStack.length > 0) {
      const prevBullet = this.bulletStack[this.bulletStack.length - 1];
      if (prevBullet.count < 2) {
        if (prevBullet.count > 0) {
          const text = '~'.repeat(prevBullet.count);
          const refNode = currentNode.children[prevBullet.nodeChildLength];
          currentNode.insertTextBefore(refNode, text, position);
        }
        this.bulletStack.pop();
        state.cancelFocus();
        continue;
      }

      prevBullet.count -= 2;
      restBulletCount -= 2;
      state.requestClose();
      const node = new StrikeNode(position);
      while (currentNode.children.length > prevBullet.nodeChildLength) {
        const childNode = currentNode.children[prevBullet.nodeChildLength];
        currentNode.removeChild(childNode);
        node.appendChild(childNode);
      }
      currentNode.appendChild(node);
    }

    if (canOpenStrike && restBulletCount >= 2) {
      if (currentNode.lastChild instanceof TextNode) {
        currentNode.lastChild.allowAppendText = false;
      }
      this.bulletStack.push({
        count: restBulletCount,
        point: this.bulletPoint,
        precededChar: this.bulletPrecededChar,
        followedChar: this.bulletFollowedChar,
        nodeChildLength: currentNode.children.length,
      });
      state.focus();
    } else {
      if (restBulletCount > 0) {
        currentNode.appendText('~'.repeat(restBulletCount), position);
      }
      restBulletCount = 0;
    }

    this.resetBullet();
    this.bulletPrecededChar = ch;

    const eol = ch === '\0';
    if (eol && this.bulletStack.length > 0) {
      const prevBullet = this.bulletStack[this.bulletStack.length - 1];
      if (prevBullet.count > 0) {
        const refNode = currentNode.children[prevBullet.nodeChildLength];
        currentNode.insertTextBefore(refNode, '~'.repeat(prevBullet.count), position);
      }
      this.bulletStack.pop();
      state.cancelFocus();
    }

    return {
      // focus: true,
      // moveBy: false,
    };
  }
}
