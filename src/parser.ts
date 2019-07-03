import Node, { RootNode } from './nodes';
import { Position, Point, mergeNode } from './utils';
import builders, { Builder, BUILD_MSG_TYPE } from './builder';
import BuildCallStack from './utils/build-call-stack';

interface BuildItem {
  name: string;
  precedence: number;
  build: Builder;
  builder: any;
}

export default function parseInline(src: string = '') {
  let point: Point = new Point(1, 1, 0);
  let builds: BuildItem[] = [];
  let currentNode: Node;

  // Initialize a build call stack
  const callStack = new BuildCallStack();
  let lastGiveUpBuildName: string = '';

  let position = new Position(point, point);
  var tree = new RootNode(position);
  currentNode = tree;

  const pointSaver: Point[] = [];

  // Initialize
  builds = initBuildList(builders);

  setPoint(new Point(1, 1, 0));

  // feed each char one by one
  while (point.offset >= 0) {
    const ch = src.charAt(point.offset);
    if (!ch) break;
    feedChar(ch, position);
  }

  // feed NULL character as end mark until all nodes are closed
  do {
    feedChar('\0', position);
  } while (!(currentNode instanceof RootNode));

  return tree;

  function feedChar(ch: string, position: Position) {
    let continueBuildChain: boolean = true;
    let moveToNextPoint: boolean = true;
    let i = 0;
    // console.log(callStack.stack.map(item => item.name));
    // console.group('[feedChar] ', ch.replace('\n', '\\n'), position.start);

    // skip builds that have given up
    for (; lastGiveUpBuildName && i < builds.length; i++) {
      if (builds[i].name === lastGiveUpBuildName) {
        i++; break;
      }
    }

    for (; continueBuildChain && i < builds.length; i++) {
      const item = builds[i];
      const rst = item.build.feed(ch, position, currentNode);
      const buildCmdList = rst ? (Array.isArray(rst) ? rst : [rst]) : [];
      // console.log('feed', item.name, rst);

      for (let cmd of buildCmdList) {
        cmd = typeof cmd === 'object' ? cmd : { type: cmd };

        switch (cmd.type) {
          // commit and open node
          case BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE:
            appendNodeAsLastChild(cmd.payload);
            openLastChildNodeOfCurrentNode();
            lastGiveUpBuildName = '';
            break;
          case BUILD_MSG_TYPE.OPEN_NODE:
            openNode(cmd.payload);
            lastGiveUpBuildName = '';
            break;
          // commit node
          case BUILD_MSG_TYPE.COMMIT_NODE:
            appendNodeAsLastChild(cmd.payload);
            lastGiveUpBuildName = '';
            // callStack.push(item.name, position);
            break;
          // case BUILD_MSG_TYPE.OPEN_NODE: openLastChildNodeOfCurrentNode(); break;

          // close node
          case BUILD_MSG_TYPE.CLOSE_NODE:
            if (currentNode.parentNode) {
              currentNode = currentNode.parentNode;
            }
            lastGiveUpBuildName = '';
            callStack.pop();
            break;

          case BUILD_MSG_TYPE.USE:
            lastGiveUpBuildName = '';
            callStack.push(item.name, position);
            continueBuildChain = false;
            break;

          case BUILD_MSG_TYPE.GIVE_UP:
            var callRecord = callStack.pop();
            setPoint(callRecord.point);
            moveToNextPoint = false;
            lastGiveUpBuildName = callRecord.name;
            continueBuildChain = false;
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

          // do nothing
          case BUILD_MSG_TYPE.NONE:
          default:
            lastGiveUpBuildName = '';
        }
        // console.groupEnd();
      }
    }

    for (; i < builds.length; i++) {
      // console.log('reset', item.name, rst);
      const item = builds[i];
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

  function appendNodeAsLastChild(node: Node) {
    if (currentNode instanceof Node) {
      currentNode.appendChild(node);
    } else {
      return false;
    }
  }
}

function initBuildList(builderMap: Map<string, typeof Builder>) {
  const buildList: BuildItem[] = [];

  for (let [name, builder] of builderMap) {
    buildList.push({
      name,
      builder,
      build: new builder(),
      precedence: 0,
    });
  }
  return buildList;
}
