import Node, { RootNode } from './nodes';
import { Position, Point } from './utils';
import builders from './builder';
import Builder from './builder/_base';
import { BuildCommand, defaultBuildCommand, BuildState } from './cmd';

interface BuildMap {
  [name: string]: Builder;
}

interface BuildCall {
  id: string;
  build: Builder;
  method: string;
}

export default function parseInline(src: string = '') {
  let point: Point = new Point(1, 1, 0);
  let currentNode: Node;
  let endFlag: boolean = false; // if true, ternimate the parsing process
  let dryRunMode: boolean = false;

  let position = new Position(point, point);
  var tree = new RootNode(position);
  currentNode = tree;

  const builds: BuildMap = {};
  for (let [name, builder] of Object.entries(builders)) {
    builds[name] = new builder();
  }

  const buildCalls: BuildCall[] = [
    { id: 'emphasis_pre', build: builds.emphasis, method: 'preFeed' },
    // { id: 'link_pre', build: builds.link, method: 'preFeed' },
    { id: 'code_span', build: builds.code_span, method: 'feed' },
    { id: 'autolink', build: builds.autolink, method: 'feed' },
    { id: 'link', build: builds.link, method: 'feed' },
    { id: 'emphasis', build: builds.emphasis, method: 'feed' },
    { id: 'entity', build: builds.entity, method: 'feed' },
    { id: 'text', build: builds.text, method: 'feed' },
  ];

  setPoint(new Point(1, 1, 0));

  // feed each char one by one
  while (point.offset >= 0) {
    const ch = src.charAt(point.offset);
    if (ch) {
      feedChar2(ch, position);
    } else {
      // feed NULL character as end mark until all nodes are closed
      feedChar2('\0', position);
      if (endFlag) { // && (currentNode instanceof RootNode)) {
        break;
      }
    }
  }

  return tree;

  /*
  function feedChar(ch: string, position: Position) {
    let continueBuildChain: boolean = true;
    let skipTextBuild: boolean = false;
    let moveToNextPoint: boolean = true;
    let i = 0;

    // skip builds that have given up
    for (; lastGiveUpBuildName && i < buildCalls.length; i++) {
      if (builds[i].name === lastGiveUpBuildName) {
        i++;
        break;
      }
    }

    for (; continueBuildChain && i < buildCalls.length; i++) {
      const item = buildCalls[i];
      if (skipTextBuild && item.id === 'text') continue;

      const rst = item.build[item.method](ch, position, currentNode, endFlag);
      const buildCmdList = rst ? (Array.isArray(rst) ? rst : [rst]) : [];

      for (let cmd of buildCmdList) {
        cmd = typeof cmd === 'object' ? cmd : { type: cmd };

        switch (cmd.type) {
          case BUILD_MSG_TYPE.OPEN_NODE:
            openNode(cmd.payload);
            lastGiveUpBuildName = '';
            break;

          case BUILD_MSG_TYPE.CLOSE_NODE:
            if (currentNode.parentNode) {
              currentNode = currentNode.parentNode;
            }
            lastGiveUpBuildName = '';
            callStack.pop();
            break;

          case BUILD_MSG_TYPE.USE:
            lastGiveUpBuildName = '';
            callStack.push(item.id, position);
            continueBuildChain = false;
            break;

          case BUILD_MSG_TYPE.GIVE_UP:
            var callRecord = callStack.pop();
            setPoint(callRecord.point);
            moveToNextPoint = false;
            lastGiveUpBuildName = callRecord.name;
            continueBuildChain = false;
            break;

          case BUILD_MSG_TYPE.SKIP_TEXT:
            skipTextBuild = true;
            break;

          case BUILD_MSG_TYPE.CLOSE_NODE_UNPAIRED:
            var callRecord = callStack.pop();
            var droppedNode = currentNode;
            var parentNode = currentNode.parentNode;
            parentNode.removeChild(droppedNode);
            currentNode = parentNode;
            setPoint(callRecord.point);
            moveToNextPoint = false;
            lastGiveUpBuildName = callRecord.name;
            break;

          case BUILD_MSG_TYPE.REQUEST_CLOSE_NODE:
            ch = '\0';
            moveToNextPoint = false;
            break;

          // terminate chain
          case BUILD_MSG_TYPE.TERMINATE:
            continueBuildChain = false;
            break;

          // pass to further chain
          case BUILD_MSG_TYPE.CONTINUE:
            continueBuildChain = true;
            break;

          case BUILD_MSG_TYPE.MOVE_TO:
            setPoint(cmd.payload);
            moveToNextPoint = false;
            break;

          case BUILD_MSG_TYPE.END:
            endFlag = true;
            break;
          case BUILD_MSG_TYPE.START:
            endFlag = false;
            break;

          // do nothing
          case BUILD_MSG_TYPE.NONE:
          default:
            lastGiveUpBuildName = '';
        }
      }
    }

    for (; i < buildCalls.length; i++) {
      const item = buildCalls[i];
      const rst = item.build.reset(ch, position);
    }

    if (moveToNextPoint) {
      const isNewLine = ch === '\n';
      setPoint(new Point(
        isNewLine ? (point.line + 1) : point.line,
        isNewLine ? 1 : point.column,
        point.offset + 1
      ));
    }
  }
  */

  function feedChar2(ch: string, position: Position) {
    let moveToNextPoint: boolean = true;
    let continueBuildChain: boolean = true;

    for (const item of buildCalls) {
      const state: BuildState = {
        node: currentNode,
        end: endFlag,
        dryRun: dryRunMode,
      };
      const rst: BuildCommand = item.build[item.method](ch, position, currentNode, endFlag, state);
      const cmd = typeof rst === 'object' ? { ...defaultBuildCommand, ...rst } : defaultBuildCommand;

      if (cmd.use) {
        continueBuildChain = false;
      }
      if (cmd.node !== undefined) {
        currentNode = cmd.node;
      }
      if (cmd.useChar !== undefined) {
        ch = cmd.useChar;
      }
      if (cmd.requestCloseNode) {
        ch = '\0';
        moveToNextPoint = false;
      }
      if (cmd.moveTo !== undefined) {
        setPoint(cmd.moveTo);
        moveToNextPoint = false;
      }
      if (cmd.dryRun !== undefined) {
        dryRunMode = cmd.dryRun;
      }
      if (cmd.end !== undefined) {
        endFlag = cmd.end;
      }
      if (cmd.moveBy !== undefined) {
        moveToNextPoint = cmd.moveBy;
      }

      if (!continueBuildChain) break;
    }

    if (moveToNextPoint) {
      const isNewLine = ch === '\n';
      setPoint(new Point(
        isNewLine ? (point.line + 1) : point.line,
        isNewLine ? 1 : point.column,
        point.offset + 1
      ));
    }
  }

  function setPoint(newPoint: Point) {
    point = newPoint;
    position = new Position(point, new Point(0, 0, point.offset + 1)); // [TODO]
  }
}
