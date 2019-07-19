import Node, { RootNode } from './nodes';
import { Position, Point, mergeNode } from './utils';
import builders, { Builder, BUILD_MSG_TYPE } from './builder';
import BuildCallStack from './utils/build-call-stack';
import TextBuilder from './builder/text';

interface BuildItem {
  name: string;
  precedence: number;
  build: Builder;
  builder: any;
  method?: string;
}

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
  let endFlag: boolean = false;

  // Initialize a build call stack
  const callStack = new BuildCallStack();
  let lastGiveUpBuildName: string = '';

  let position = new Position(point, point);
  var tree = new RootNode(position);
  currentNode = tree;

  const builds: BuildMap = {};
  for (let [name, builder] of builders) {
    builds[name] = new builder();
  }

  const buildCalls: BuildCall[] = [
    { id: 'emphasis_pre', build: builds.emphasis, method: 'preFeed' },
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
      feedChar(ch, position);
    } else {
      // feed NULL character as end mark until all nodes are closed
      feedChar('\0', position);
      if (endFlag) { // && (currentNode instanceof RootNode)) {
        break;
      }
    }
  }

  return tree;

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

  function setPoint(newPoint: Point) {
    point = newPoint;
    position = new Position(point, new Point(0, 0, point.offset + 1)); // [TODO]
  }

  function openNode(node: Node) {
    currentNode = node;
  }

  function openLastChildNodeOfCurrentNode() {
    if (currentNode instanceof Node) {
      openNode(currentNode.children[currentNode.children.length - 1]);
    }
  }
}
