import Node, { Point, Position } from "./nodes";
import Builder from './builder/_base';

export type FocusRecordID = number;

export type Precedence = number;

export interface BuildCommandObject {
  node?: Node;
  use?: boolean;
  useChar?: string;
  requestCloseNode?: boolean;
  moveBy?: boolean | number;
  moveTo?: Point;
  end?: boolean; // [TODO]
  dryRun?: boolean;
  focus?: boolean,
  cancelFocus?: FocusRecordID;
  monopoly?: boolean;
}

export type BuildCommand = undefined | null | BuildCommandObject;

export const defaultBuildCommand: BuildCommand = {
  node: undefined,
  use: false,
  useChar: undefined,
  requestCloseNode: false,
  moveBy: undefined,
  moveTo: undefined,
  end: undefined,
  dryRun: undefined,
  focus: undefined,
  cancelFocus: undefined,
  monopoly: undefined,
};


export interface BuildMap {
  [name: string]: Builder;
}

export interface BuildExecutor {
  id: string;
  build: Builder;
  method: string;
  precedence?: number;
}

export interface BuildState {
  node: Node;
  dryRun: boolean;
  end: boolean;
  focusRecords: FocusRecordStack;
  focus: () => void;
  cancelFocus: () => void;
  canCloseNode: () => boolean;
  scheduleCloseNode: () => boolean;
  requestClose: (precedence: Precedence, source?: any) => void;
}

/**
 * @class build exec call record stack
 */
export interface FocusRecord {
  executor: BuildExecutor;
  point: Point;
  position: Position;
}

export class FocusRecordStack {
  public stack: Array<FocusRecord> = [];
  public get last(): FocusRecord {
    return this.stack[this.stack.length - 1];
  }
  public push(executor: BuildExecutor, position: Position) {
    return this.stack.push({
      executor,
      point: position.start,
      position,
    });
  }
  public pop() {
    return this.stack.pop();
  }
}

export enum TokenTypes {
  NextChar = 'NEXT_CHAR',
  RequestClose = 'REQUEST_CLOSE',
}

export interface Token {
  type: TokenTypes;
  payload?: any;
  // source?: string;
}


