import { Point, Position } from '../utils';
import Node from '../nodes';

export default class BaseBuilder {
  [props: string]: any;
  update(ch: string, point: Point) {
    return;
  }
  feed(ch: string, position: Position, currentNode?: Node): (BuildCmd) {
    return { type: BUILD_MSG_TYPE.NONE };
  }
  reset(ch: string, position: Position): (BuildCmd) {
    return { type: BUILD_MSG_TYPE.NONE };
  }
}

// export enum BUILD_CMD {
//   END_NODE,
//   START_NODE,
//   UPDATE_NODE,
//   VENTURE_START,
//   VENTURE_START_CONFIRM,
//   VENTURE_START_DROP,
// };

export enum BUILD_MSG_TYPE {
  PREPARE_NODE,
  COMMIT_NODE,
  COMMIT_AND_OPEN_NODE,
  OPEN_NODE,
  CLOSE_NODE,
  DROP_NODE,
  NONE, // a build reacts nothing to a char.
  USE, // a build receives a char and requests not to pass it to other builds.
  GIVE_UP, // a build decides to quit building a new node
  /* process control */
  TERMINATE,
  CONTINUE,
  /* Errors */
  CLOSE_NODE_UNPAIRED,
}

export interface BuildCmdObject {
  type: BUILD_MSG_TYPE,
  payload?: any,
};

export type BuildCmdSingle = BuildCmdObject | BUILD_MSG_TYPE | undefined | null;
export type BuildCmdList = BuildCmdSingle[] | BuildCmdSingle;
export type BuildCmd = BuildCmdSingle[] | BuildCmdSingle;

