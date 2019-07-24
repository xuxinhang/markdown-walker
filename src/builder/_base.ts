import { Position } from '../utils';
import Node from '../nodes';
import { BuildState, BuildCommand } from '../cmd';

export default class BaseBuilder {
  [props: string]: any;

  feed(ch: string, position: Position, currentNode?: Node, innerEnd?: boolean, state?: BuildState): BuildCommand {
    return { /* NONE */ };
  }

  reset(ch: string, position: Position, state?: BuildState): BuildCommand {
    return { /* NONE */ };
  }
}

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
  SKIP_TEXT = 'SKIP_TEXT',
  /* Errors */
  CLOSE_NODE_UNPAIRED = 'CLOSE_NODE_UNPAIRED',

  CLOSE_NODE = 'CLOSE_NODE',
  COMMIT_AND_OPEN_NODE = 'COMMIT_AND_OPEN_NODE',
  DROP_NODE = 'DROP_NODE',

  MOVE_TO = 'MOVE_TO',
  REQUEST_CLOSE_NODE = 'REQUEST_CLOSE_NODE',
  // SAVE_POINT = 'SAVE_POINT',
  // RESTORE_POINT = 'RESTORE_POINT',

  END = 'END',
  START = 'START',
}

export interface BuildCmdObject {
  type: BUILD_MSG_TYPE,
  payload?: any,
};

export type BuildCmdSingle = BuildCmdObject | BUILD_MSG_TYPE | undefined | null;
export type BuildCmdList = BuildCmdSingle[] | BuildCmdSingle;
export type BuildCmd = BuildCmdSingle[] | BuildCmdSingle;

