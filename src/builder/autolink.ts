import BaseBuilder from './_base';
import { Point, Position, isASCIIControlChar, isControlChar, isWhitespaceChar } from '../utils';
import Node, { CodeSpanNode, AutolinkNode, AutolinkType } from '../nodes';
import { BuildState, BuildCommand } from '../cmd';


/**
 * @description
 * There are two stages - scan and read.
 * Step into scan stage when meeting a left angle bracket.
 * For the scan stage, scan the character flow until meeting a right angle bracket.
 * Illegal characters (included in neither the URI nor email address pattern) would
 * lead to failure.
 * For the read stage, read the ranged string into a buffer, then try to parse it as
 * an URI or email address (regex matching). Create and append an autolink node if
 * succeed, otherwise rise failure.
 */
enum BuildStage { None, Scan, Read };

/**
 * In the URI pattern, some characters (whitespace, ctrl-char, <, >) is not in
 * consideration, which are excluded during the scan stage.
 */
const URI_REGEX = /^[A-Za-z][0-9A-Za-z.+-]{1,31}:.*?$/;
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export default class AutolinkBuilder extends BaseBuilder {
  stage: BuildStage;
  leftAnglePoint: Point;
  leftAngleOffset: number;
  rightAngleOffset: number;
  skipActive: boolean;
  skipRangeEndOffset: number;
  destBuffer: string;

  constructor() {
    super();
    this.resetInnerState();
  }

  private resetInnerState() {
    this.stage = BuildStage.None;
    this.leftAnglePoint = null;
    this.leftAngleOffset = 0;
    this.rightAngleOffset = 0;
    this.skipActive = false;
    this.skipRangeEndOffset = 0;
    this.destBuffer = '';
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState): BuildCommand {
    if (this.skipActive && position.start.offset <= this.skipRangeEndOffset) return;

    if (this.stage === BuildStage.None) {
      if (ch === '<') {
        this.stage = BuildStage.Scan;
        this.leftAngleOffset = position.start.offset;
        this.leftAnglePoint = position.start;
        return { use: true };
      }
      return;
    }

    if (this.stage === BuildStage.Scan) {
      if (isASCIIControlChar(ch) || isWhitespaceChar(ch) /* || ch === '<' */) {
        const nextPoint = this.leftAnglePoint;
        this.resetInnerState();
        this.skipActive = true;
        this.skipRangeEndOffset = position.start.offset;
        return { use: true, moveTo: nextPoint };
      }

      if (ch === '>') {
        const nextPoint = this.leftAnglePoint;
        this.rightAngleOffset = position.start.offset;
        this.stage = BuildStage.Read;
        this.destBuffer = '';
        return { use: true, moveTo: nextPoint };
      }

      return { use: true };
    }

    if (this.stage === BuildStage.Read) {
      const offset = position.start.offset;
      // ignore the first angle bracket character
      if (offset <= this.leftAngleOffset) return { use: true };

      // meet the ending
      if (offset >= this.rightAngleOffset) {
        const type = URI_REGEX.test(this.destBuffer) ? AutolinkType.URI
          : EMAIL_REGEX.test(this.destBuffer) ? AutolinkType.Email
          : undefined;
        if (type === undefined) {
          const nextPoint = this.leftAnglePoint;
          const skipOffset = this.rightAngleOffset;
          this.resetInnerState();
          this.skipActive = true;
          this.skipRangeEndOffset = skipOffset;
          return { use: true, moveTo: nextPoint };
        }
        if (!state.dryRun) {
          currentNode.appendChild(new AutolinkNode(position, this.destBuffer, type));
        }
        const nextPoint = new Point(1, 1, this.rightAngleOffset + 1);
        this.resetInnerState();
        return { use: true, moveTo: nextPoint };
      }

      this.destBuffer += ch;
      return { use: true };
    }
  }
}
