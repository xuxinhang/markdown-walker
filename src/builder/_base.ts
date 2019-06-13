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
  OPEN_NODE,
  // TRY_START,
  // TRY_CANCEL,
  // TRY_FINISH,
  NONE = 'NONE', // a build reacts nothing to a char.
  USE = 'USE', // a build receives a char and requests not to pass it to other builds.
  GIVE_UP = 'GIVE_UP', // a build decides to quit building a new node
  /* process control */
  TERMINATE = 'TERMINATE',
  CONTINUE = 'CONTINUE',
  /* Errors */
  CLOSE_NODE_UNPAIRED = 'CLOSE_NODE_UNPAIRED',

  CLOSE_NODE = 'CLOSE_NODE',
  COMMIT_AND_OPEN_NODE = 'COMMIT_AND_OPEN_NODE',
  DROP_NODE = 'DROP_NODE',
}

export interface BuildCmdObject {
  type: BUILD_MSG_TYPE,
  payload?: any,
};

export type BuildCmdSingle = BuildCmdObject | BUILD_MSG_TYPE | undefined | null;
export type BuildCmdList = BuildCmdSingle[] | BuildCmdSingle;
export type BuildCmd = BuildCmdSingle[] | BuildCmdSingle;

