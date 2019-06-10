import BaseBuilder, { BUILD_MSG_TYPE } from './_base';
import { Point, Position } from '../utils';
import Node, { TextNode } from '../nodes';

export default class TextBuilder extends BaseBuilder {
  /*update(ch: string, point: Point, cache: any) {
    return [
      BUILD_CMD.START_NODE,
      new TextNode(ch, new Position(point, undefined)),
    ];
  }*/

  feed(ch: string, position: Position) {
    return {
      type: BUILD_MSG_TYPE.COMMIT_NODE,
      payload: new TextNode(ch, position),
    };
  }
}
