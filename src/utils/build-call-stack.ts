import { Point, Position } from "../nodes";

/**
 * @module - Build Call Stack
 */

export interface BuildCall {
  name: string;
  point: Point;
  position: Position;
}

export default class BuildCallStack {
  private stack: BuildCall[] = [];

  public push (name: string, position: Position) {
    return this.stack.push({ name, position, point: position.start });
  }

  public pop () {
    return this.stack.pop();
  }
}