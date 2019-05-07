import { Point } from "../nodes";
// import CONT from '../symbols';

export default class BaseBuilder {
  [props: string]: any;
  update(ch: string, point: Point) {
    return;
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

