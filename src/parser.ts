import Node, { RootNode } from './nodes';
import { Position, Point } from './utils';
import builders from './builder';
import {
  BuildCommand, defaultBuildCommand,
  FocusRecordStack, BuildState,
  BuildMap, BuildExecutor, Precedence,
  Token, TokenTypes,
} from './cmd';

export default function parseInline(src: string = '') {
  // initial state varibles
  let point: Point;
  let position: Position;
  let currentNode: Node;
  let endFlag: boolean = false; // if true, ternimate the parsing process
  let dryRunMode: boolean = false;
  setPoint(new Point(1, 1, 0));
  // initial a build record stack
  const focusRecordStack = new FocusRecordStack();
  let monopolyMode: boolean = false;
  let monopolyExecId: string = '';

  // prepare the build executor list
  const builds: BuildMap = {};
  for (let [name, builder] of Object.entries(builders)) {
    builds[name] = new builder();
  }

  const executors: BuildExecutor[] = [
    // { id: 'emphasis_pre', build: builds.emphasis, method: 'preFeed', precedence: 3 },
    { id: 'code_span', build: builds.code_span, method: 'feed', precedence: 9 },
    // { id: 'autolink', build: builds.autolink, method: 'feed', precedence: 9 },
    // { id: 'link', build: builds.link, method: 'feed', precedence: 5 },
    // { id: 'emphasis', build: builds.emphasis, method: 'feed', precedence: 3 },
    { id: 'strike', build: builds.strike, method: 'feed', precedence: 3 },
    { id: 'mark', build: builds.mark, method: 'feed', precedence: 3 },
    // { id: 'entity', build: builds.entity, method: 'feed', precedence: 1 },
    { id: 'text', build: builds.text, method: 'feed', precedence: 0 },
  ];
  const rootMockedExecutor: BuildExecutor = { id: 'text', build: null, method: '_' };

  // insert a root node as the root node
  var tree = new RootNode(position);
  currentNode = tree;
  focusRecordStack.push(rootMockedExecutor, position);

  // token queue
  let tokenQueue: Token[] = [];

  // feed each char one by one
  while (true) {
    while (tokenQueue.length > 0) {
      const tk = tokenQueue.shift();
      feedChar2('', position, tk);
    }

    const ch = src.charAt(point.offset);
    if (ch) {
      feedChar2(ch, position, { type: TokenTypes.NextChar, payload: { char: ch } });
    } else {
      feedChar2('\0', position, { type: TokenTypes.NextChar, payload: { char: '\0' } });
      const ch_temp = src.charAt(point.offset);
      if (!ch_temp && tokenQueue.length === 0) {
        const requestCloseToken: Token = {
          type: TokenTypes.RequestClose,
          payload: { precedence: 9999 },
        };
        feedChar2('\0', position, requestCloseToken);
        if (/* endFlag || */ (currentNode instanceof RootNode)) {
          break;
        }
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

  function feedChar2(ch: string, position: Position, token?: Token) {
    let moveToNextPoint: boolean = token.type === TokenTypes.NextChar ? true : false;
    let continueBuildChain: boolean = true;
    let allowTextBuild: boolean = true;
    let scheduledCloseNode: boolean = false;

    for (const exec of executors) {
      scheduledCloseNode = false;
      if (monopolyMode && exec.id !== monopolyExecId) continue;

      const state: BuildState = {
        node: currentNode,
        end: endFlag,
        dryRun: dryRunMode,
        focusRecords: focusRecordStack,
        focus() {
          focusRecordStack.push(exec, position);
        },
        cancelFocus() {
          focusRecordStack.pop();
        },
        canCloseNode() {
          return focusRecordStack.last.executor.precedence <= exec.precedence;
        },
        scheduleCloseNode() {
          const can = this.canCloseNode();
          if (can) scheduledCloseNode = true;
          return can;
        },
        requestClose(precedence: Precedence, source?: any) {
          tokenQueue.push({
            type: TokenTypes.RequestClose,
            payload: { precedence, source },
          });
        },
      };
      if (exec.id === 'text' && !allowTextBuild) continue;
      const rst: BuildCommand = exec.build[exec.method](ch, position, currentNode, endFlag, state, token);
      const cmd = typeof rst === 'object' ? { ...defaultBuildCommand, ...rst } : defaultBuildCommand;

      if (cmd.use) {
        allowTextBuild = false;
        // continueBuildChain = false;
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
        moveToNextPoint = cmd.moveBy > 0;
      }
      if (cmd.focus !== undefined) {
        if (cmd.focus) {
          focusRecordStack.push(exec, position);
        }
      }
      if (cmd.cancelFocus !== undefined) {
        focusRecordStack.pop(); // [TODO]
      }
      if (cmd.monopoly !== undefined) {
        if (cmd.monopoly) {
          monopolyMode = true;
          monopolyExecId = exec.id;
        } else {
          monopolyMode = false;
        }
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

