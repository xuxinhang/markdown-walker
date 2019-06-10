import { Point, Position } from '../utils';
import Node from '../nodes';
// import CONT from '../symbols';

export default class BaseBuilder {
  [props: string]: any;
  update(ch: string, point: Point) {
    return;
  }
  feed(ch: string, position: Position, currentNode?: Node): (BuildMsg | BuildMsg[]) {
    return { type: BUILD_MSG_TYPE.NONE };
  }
  reset(ch: string, position: Position): (BuildMsg | BuildMsg[]) {
    return { type: BUILD_MSG_TYPE.NONE };
  }
}

export enum BUILD_CMD {
  END_NODE,
  START_NODE,
  UPDATE_NODE,
  VENTURE_START,
  VENTURE_START_CONFIRM,
  VENTURE_START_DROP,
};

export enum BUILD_MSG_TYPE {
  PREPARE_NODE,
  COMMIT_NODE,
  COMMIT_AND_OPEN_NODE,
  OPEN_NODE,
  CLOSE_NODE,
  DROP_NODE,
  NONE,
  USE,
}

export interface BuildMsg {
  type: BUILD_MSG_TYPE,
  payload?: any,
};

