import Node, { Point } from "./nodes";

export interface BuildCommandObject {
  node?: Node;
  use?: boolean;
  useChar?: string;
  requestCloseNode?: boolean;
  moveBy?: boolean | number;
  moveTo?: Point;
  end?: boolean; // [TODO]
  dryRun?: boolean;
}

export type BuildCommand = undefined | null | BuildCommandObject;

export const defaultBuildCommand = {
  node: undefined,
  use: false,
  useChar: undefined,
  requestCloseNode: false,
  moveBy: true,
  moveTo: undefined,
  end: false,
  dryRun: undefined,
};

export interface BuildState {
  node: Node;
  dryRun: boolean;
  end: boolean;
}

