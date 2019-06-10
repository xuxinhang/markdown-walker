import Node, { RootNode, PaternalNode } from './nodes';
import { Position, Point } from './utils';
import builders, { Builder, BUILD_MSG_TYPE } from './builder';

const builds: Builder[] = [];

interface BuildItem {
  name: string;
  precedence: number;
  build: Builder;
  builder: any;
}

export default function parse(src: string = '') {
  const stack: Node[] = [];
  let point: Point = new Point(1, 1, 0);
  let builds: BuildItem[] = [];
  let currentNode: Node;
  let rootNode: RootNode;

  let position = new Position(point, point);
  let tree = new RootNode({ position });
  rootNode = tree;
  currentNode = tree;

  // Initialize
  builds = initBuildList(builders);
  feedChar('\n', position);

  while (true) {
    const ch = src.charAt(point.offset);
    if (!ch) break;

    feedChar(ch, position);

    // Create a new Point object
    point = new Point(
      ch === '\n' ? (point.line + 1) : point.line,
      ch === '\n' ? 1 : point.column,
      point.offset + 1
    );
  }

  return tree;

  // Feed a single char into each build
  function feedChar(ch: string, position: Position) {
    let handledFlag = false;

    for (let item of builds) {
      if (handledFlag) {
        const rst = item.build.reset(ch, position);
        console.log('reset', item.name, rst);
      } else {
        const rst = item.build.feed(ch, position, currentNode);
        const buildMsgList = Array.isArray(rst) ? rst : [rst];
        handledFlag = true;
        console.log('feed', item.name, rst);

        for (let msg of buildMsgList) {
          switch (msg.type) {
            case BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE:
              appendNodeAsLastChild(msg.payload);
              openLastChildNodeOfCurrentNode();
              break;
            case BUILD_MSG_TYPE.COMMIT_NODE:
              appendNodeAsLastChild(msg.payload);
              break;
            // case BUILD_MSG_TYPE.OPEN_NODE: openLastChildNodeOfCurrentNode(); break;
            case BUILD_MSG_TYPE.CLOSE_NODE:
              if (currentNode.parentNode) {
                currentNode = currentNode.parentNode;
              }
              break;
            case BUILD_MSG_TYPE.USE:
              break;
            case BUILD_MSG_TYPE.NONE:
            default:
              handledFlag = false;
          }
        }
      }
    }
  }

  function openNode(node: Node) {
    currentNode = node;
  }

  function openLastChildNodeOfCurrentNode() {
    if (currentNode instanceof PaternalNode) {
      openNode(currentNode.children[currentNode.children.length - 1]);
    }
  }

  function appendNodeAsLastChild(node: Node) {
    if (currentNode instanceof PaternalNode) {
      return currentNode.appendChild(node);
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

