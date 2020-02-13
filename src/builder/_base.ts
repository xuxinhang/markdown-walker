import { Position } from '../utils';
import Node from '../nodes';
import { BuildState, BuildCommand, Token } from '../cmd';

/**
 * @class the buidler base class
 * rewrite the "feed" method to create different buidler classes
 */
export default class BaseBuilder {
  [props: string]: any;

  feed(ch: string, position: Position, currentNode?: Node, innerEnd?: boolean, state?: BuildState, token?: Token): BuildCommand {
    return { /* NONE */ };
  }

  reset(ch: string, position: Position, state?: BuildState): BuildCommand {
    return { /* NONE */ };
  }
}
