import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position, findParentNode } from '../utils';
import Node, { StrongNode } from '../nodes';

interface StrongBuilderNodeInnerData {
  bulletChar: string;
}

const validBulletChars = ['*', '_'];
const isValidBulletChar = (c: string) => validBulletChars.indexOf(c) >= 0;

export default class StrongBuilder extends BaseBuilder {
  private bulletChar: string = '';
  private bulletCount: number = 0;
  private bulletPoint: Point = null;

  private resetBullet() {
    this.bulletChar = '';
    this.bulletCount = 0;
    this.bulletPoint = undefined;
  }

  public feed(ch: string, position: Position, currentNode: Node) {
    if (this.bulletChar) {
      if (ch === this.bulletChar) {
        this.bulletCount++;
      } else {
        this.resetBullet();
        return [
          { type: BUILD_MSG_TYPE.GIVE_UP, payload: this.bulletPoint },
          BUILD_MSG_TYPE.TERMINATE,
        ];
      }
    } else {
      if (isValidBulletChar(ch)) {
        this.bulletChar = ch;
        this.bulletPoint = position.start;
        this.bulletCount = 1;
        return [ BUILD_MSG_TYPE.USE, BUILD_MSG_TYPE.TERMINATE ];
      } else {
        return;
      }
    }

    if (this.bulletCount < 2) {
      return BUILD_MSG_TYPE.TERMINATE;
    }

    if (currentNode instanceof StrongNode && currentNode.lastChild) {
      const nodeInnerData = currentNode.getInnerData('strongBuilder');
      if (nodeInnerData && nodeInnerData.bulletChar === this.bulletChar) {
        this.resetBullet();
        return [ BUILD_MSG_TYPE.CLOSE_NODE, BUILD_MSG_TYPE.TERMINATE ];
      }
    }

    // Create and open a new strong node
    const newNode = new StrongNode(new Position(this.bulletPoint, this.bulletPoint));
    newNode.setInnerData('strongBuilder', {
      bulletChar: this.bulletChar,
    });
    this.resetBullet();
    return [
      { type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE, payload: newNode },
      BUILD_MSG_TYPE.TERMINATE,
    ];
  }
}
