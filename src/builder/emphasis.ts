import BaseBuilder, { BUILD_MSG_TYPE, BuildCmd } from './_base';
import { Point, Position, isUnicodeWhitespaceChar, isPunctuationChar, repeatChar } from '../utils';
import Node, { EmphasisNode, StrongNode, TextNode } from '../nodes';

/* export default class EmphasisBuilder extends BaseBuilder {
  feed(ch: string, position: Position, currentNode: Node) {
    if (ch !== '*' && ch !== '_') return;

    const currentBulletChar = ch;

    if (currentNode instanceof EmphasisNode && currentNode.lastChild) {
      const innerData = currentNode.getInnerData('emphasisBuilder');
      const previousBulletChar = innerData && innerData.bulletChar;
      if (previousBulletChar === currentBulletChar) {
        return [ { type: BUILD_MSG_TYPE.CLOSE_NODE }, BUILD_MSG_TYPE.TERMINATE ];
      }
    }

    const newNode = new EmphasisNode(position);
    newNode.setInnerData('emphasisBuilder', { bulletChar: currentBulletChar });
    return [
      BUILD_MSG_TYPE.USE,
      { type: BUILD_MSG_TYPE.COMMIT_AND_OPEN_NODE, payload: newNode },
      BUILD_MSG_TYPE.TERMINATE,
    ];
  }
} */

enum BulletType { LEFT = 2, RIGHT = 1, BOTH = 3, NEITHER = 0 };

export default class EmphasisBuilder extends BaseBuilder {
  private bulletChar: string = '';
  private bulletCount: number = 0;
  private bulletPoint: Point = null;
  private bulletType: BulletType = BulletType.NEITHER;
  private bulletPrecededChar: string = '';
  private bulletFollowedChar: string = '';

  constructor() {
    super();
    this.resetBullet();
  }

  private resetBullet() {
    this.bulletChar = '';
    this.bulletCount = 0;
    this.bulletPoint = null;
    // the beginning and the end of the line count as Unicode whitespace
    this.bulletPrecededChar = ' ';
    this.bulletFollowedChar = '';
  }

  get bulletLeftFlanking () {
    const followedByUnicodeWhitespace = this.bulletFollowedChar === '\0' || isUnicodeWhitespaceChar(this.bulletFollowedChar);
    const followedByPunctuationChar = isPunctuationChar(this.bulletFollowedChar);
    const precededByUnicodeWhitespace = isUnicodeWhitespaceChar(this.bulletPrecededChar);
    const precededByPunctuationChar = isPunctuationChar(this.bulletPrecededChar);

    return !followedByUnicodeWhitespace && // (1)
      (!followedByPunctuationChar || // (2a)
        (followedByPunctuationChar && (precededByUnicodeWhitespace || precededByPunctuationChar)) // (2b)
      );
  }

  get bulletRightFlanking () {
    // the beginning and the end of the line count as Unicode whitespace.
    const followedByUnicodeWhitespace = this.bulletFollowedChar === '\0' || isUnicodeWhitespaceChar(this.bulletFollowedChar);
    const followedByPunctuationChar = isPunctuationChar(this.bulletFollowedChar);
    const precededByUnicodeWhitespace = isUnicodeWhitespaceChar(this.bulletPrecededChar);
    const precededByPunctuationChar = isPunctuationChar(this.bulletPrecededChar);

    return !precededByUnicodeWhitespace && // (1)
      (!precededByPunctuationChar || // (2a)
        (precededByPunctuationChar && (followedByUnicodeWhitespace || followedByPunctuationChar)) // (2b)
      );
  }

  feed(ch: string, position: Position, currentNode: Node): BuildCmd {
    const eol = ch === '\0';

    if (ch !== '*' && ch !== '_') {
      if (this.bulletCount) {
        this.bulletFollowedChar = ch;

        let prevBulletCount: number = 0;
        let curtBulletCount: number = this.bulletCount;
        // let openNode: Node = null;

        // decide whether the delimiter run can open/close emphasis
        let canOpenNode = false, canCloseNode = false;
        switch (this.bulletChar) {
          case '*':
            canOpenNode = this.bulletLeftFlanking;
            canCloseNode = this.bulletRightFlanking;
            break;
          case '_':
            canOpenNode = this.bulletLeftFlanking &&
              (!this.bulletRightFlanking || (this.bulletRightFlanking && isPunctuationChar(this.bulletPrecededChar)));
            canCloseNode = this.bulletRightFlanking &&
              (!this.bulletLeftFlanking || (this.bulletLeftFlanking && isPunctuationChar(this.bulletFollowedChar)));
            break;
        }

        // if this bullet run can close emphasis node
        if (canCloseNode) {
          const textifyPlan: EmphasisNode[] = [];
          // then try to close the current node and all parent nodes
          while (
            currentNode instanceof EmphasisNode && // current in emphasis node
            curtBulletCount > 0 // there are still bullets
          ) {
            // Rule 9, 10
            if (currentNode.bulletOpenCanBothOpenAndClose || canOpenNode && canCloseNode) {
              if ((this.bulletCount + currentNode.bulletOpenRunLength) % 3 === 0) {
                if (!(this.bulletCount % 3 === 0 && currentNode.bulletOpenRunLength % 3 === 0)) {
                  // the current run cannot matches the previous run due to rules
                  textifyPlan.push(currentNode);
                  const parent = currentNode.parentNode;
                  if (parent instanceof EmphasisNode) {
                    currentNode = currentNode.parentNode;
                    continue;
                  } else {
                    break;
                  }
                }
              }
            }

            if (currentNode.bulletChar !== this.bulletChar) {
              // the current run cannot matches the previous run due to rules
              textifyPlan.push(currentNode);
              const parent = currentNode.parentNode;
              if (parent instanceof EmphasisNode) {
                currentNode = currentNode.parentNode;
                continue;
              } else {
                break;
              }
            }

            textifyPlan.forEach(textifyNode);
            textifyPlan.splice(0);

            prevBulletCount = currentNode.bulletCount;

            // previous delimiter run vs. current delimiter run
            if (prevBulletCount <= curtBulletCount) {
              curtBulletCount = curtBulletCount - prevBulletCount;

              // normalize the previous temp emphasis node into a node tree consisting of em and strong
              const newNode = generateEmphasisNodeTree(prevBulletCount, position, currentNode);
              const parent = currentNode.parentNode;
              parent.replaceChild(newNode, currentNode);

              currentNode = parent;
            } else {
              prevBulletCount = prevBulletCount - curtBulletCount; // > 0
              currentNode.bulletCount = prevBulletCount;

              // move children into new node
              const targetNode = generateEmphasisNodeTree(curtBulletCount, position, currentNode);
              currentNode.appendChild(targetNode);

              curtBulletCount = 0; // insert no more emphasis node
            }
          }
        }

        if (curtBulletCount > 0) {
          if (canOpenNode) {
            const emNode = new EmphasisNode(position);
            emNode.bulletChar = this.bulletChar;
            emNode.bulletCount = curtBulletCount;
            emNode.bulletOpenRunLength = this.bulletCount;
            emNode.bulletCloseRunLength = undefined;
            emNode.bulletOpenCanBothOpenAndClose = canOpenNode && canCloseNode;
            currentNode.appendChild(emNode);

            currentNode = emNode;
          } else {
            currentNode.appendText(repeatChar(this.bulletChar, curtBulletCount), position);
          }
        }

        this.resetBullet();
        this.bulletPrecededChar = ch;

        if (eol && (currentNode instanceof EmphasisNode)) {
          let parent = currentNode.parentNode;
          textifyNode(currentNode);
          currentNode = parent;
        }

        return [
          { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode },
        ];
      } else {
        this.bulletPrecededChar = ch;

        if (eol && (currentNode instanceof EmphasisNode)) {
          let parent = currentNode.parentNode;
          textifyNode(currentNode);
          currentNode = parent;
        }

        return { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode };
      }
    } else {
      if (this.bulletCount) {
        if (this.bulletChar === ch) {
          this.bulletCount++;
        }
        return BUILD_MSG_TYPE.USE;
      } else {
        this.bulletChar = ch;
        this.bulletCount = 1;
        return BUILD_MSG_TYPE.USE;
      }
    }
  }
}

function textifyNode (node: EmphasisNode) {
  // flat the unpaired emphasis node into text node
  const parent = node.parentNode;
  let text = ''; // repeatChar(node.bulletChar, node.bulletCount);
  for (var i = node.bulletCount; i > 0; i--) text += node.bulletChar;
  // text = node.bulletChar.repeat(node.bulletCount);
  parent.insertBefore(new TextNode(text, node.position), node);
  for (let child of node.children) parent.insertBefore(child, node);
  parent.removeChild(node);
}


/**
 * Generate a normalized emphasis node tree
 */
function generateEmphasisNodeTree(bulletCount: number, position: Position, emNode: Node): Node {
  let node: Node = null;
  let innerNode: Node = null;
  // let bulletChar = emNode.bulletChar;

  for (; bulletCount >= 2; bulletCount -= 2) {
    const upperNode = new StrongNode(position);
    if (node) upperNode.appendChild(node);
    node = upperNode;
    innerNode = innerNode || node;
  }

  if (bulletCount) {
    const upperNode = new EmphasisNode(position);
    if (node) upperNode.appendChild(node);
    node = upperNode;
    innerNode = innerNode || node;
  }

  while (emNode.firstChild) {
    innerNode.appendChild(emNode.removeChild(emNode.firstChild));
  }

  return node;
}
