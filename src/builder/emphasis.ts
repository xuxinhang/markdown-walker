import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position } from '../utils';
import Node, { EmphasisNode } from '../nodes';

export default class EmphasisBuilder extends BaseBuilder {
  feed(ch: string, position: Position, currentNode: Node) {
    if (ch !== '*' && ch !== '_') return;

    const currentBulletChar = ch;
    const innerData = currentNode.getInnerData('emphasisBuilder');
    const previousBulletChar = innerData && innerData.bulletChar;

    if (currentNode.type === 'emphasis' && previousBulletChar === currentBulletChar) {
      return [ { type: BUILD_MSG_TYPE.CLOSE_NODE }, BUILD_MSG_TYPE.TERMINATE ];
    } else {
      const newNode = new EmphasisNode(position);
      newNode.setInnerData('emphasisBuilder', { bulletChar: currentBulletChar });
      return [
        { type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE, payload: newNode },
        BUILD_MSG_TYPE.TERMINATE,
      ];
    }
  }
}
