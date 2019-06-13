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
        return { type: BUILD_MSG_TYPE.GIVE_UP, payload: this.bulletPoint };
      }
    } else {
      if (isValidBulletChar(ch)) {
        this.bulletChar = ch;
        this.bulletPoint = position.start;
        this.bulletCount = 1;
        return { type: BUILD_MSG_TYPE.USE };
      } else {
        return { type: BUILD_MSG_TYPE.NONE }
      }
    }

    if (this.bulletCount < 2) {
      return { type: BUILD_MSG_TYPE.USE };
    }

    // Meet an open or close marker
    const node = findParentNode(currentNode, node => {
      const nodeInnerData: StrongBuilderNodeInnerData = node.getInnerData('strongBuilder');
      return node instanceof StrongNode && nodeInnerData && nodeInnerData.bulletChar === this.bulletChar;
    });

    if (!node) {
      // Create and open a new strong node
      const newNode = new StrongNode(position);
      newNode.setInnerData('strongBuilder', {
        bulletChar: this.bulletChar,
      });
      this.resetBullet();
      return {
        type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE,
        payload: newNode,
      };
    } else if (node === currentNode) {
      // close current strong node
      this.resetBullet();
      return { type: BUILD_MSG_TYPE.CLOSE_NODE };
    } else {
      // throw error: fail to close node
      this.resetBullet();
      return { type: BUILD_MSG_TYPE.CLOSE_NODE_UNPAIRED };
    }
  }
}
