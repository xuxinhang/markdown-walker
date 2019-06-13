import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position } from '../utils';
import Node, { EmphasisNode } from '../nodes';

export default class EmphasisBuilder extends BaseBuilder {
  feed(ch: string, position: Position, currentNode: Node) {
    if (ch !== '*' && ch !== '_') return;

    const currentBulletChar = ch;

    if (currentNode instanceof EmphasisNode && currentNode.lastChild) {
      const innerData = currentNode.getInnerData('emphasisBuilder');
      const previousBulletChar = innerData && innerData.bulletChar;
      if (previousBulletChar === currentBulletChar) {
        return [ { type: BUILD_MSG_TYPE.CLOSE_NODE }, BUILD_MSG_TYPE.TERMINATE ];
      }
    }

    const newNode = new EmphasisNode(position);
    newNode.setInnerData('emphasisBuilder', { bulletChar: currentBulletChar });
    return [
      BUILD_MSG_TYPE.USE,
      { type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE, payload: newNode },
      BUILD_MSG_TYPE.TERMINATE,
    ];
  }
}
