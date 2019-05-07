import BaseBuilder from './_base';
import { Point, Position } from '../nodes';
import { BUILD_CMD } from './_base';
import { TextNode } from '../nodes';

export default class TextBuilder extends BaseBuilder {
  update(ch: string, point: Point, cache: any) {
    return [
      BUILD_CMD.START_NODE,
      new TextNode(ch, new Position(point, undefined)),
    ];
  }
}
