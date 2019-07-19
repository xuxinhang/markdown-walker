import BaseBuilder, { BUILD_MSG_TYPE, BuildCmd } from './_base';
import { Point, Position, isUnicodeWhitespaceChar, isPunctuationChar, repeatChar } from '../utils';
import Node, { EmphasisNode, StrongNode, TextNode } from '../nodes';

enum BulletType { LEFT = 2, RIGHT = 1, BOTH = 3, NEITHER = 0 };

export default class EmphasisBuilder extends BaseBuilder {
  private bulletChar: string = '';
  private bulletCount: number = 0;
  private bulletPoint: Point = null;
  private bulletType: BulletType = BulletType.NEITHER;
  private bulletPrecededChar: string = '';
  private bulletFollowedChar: string = '';

  private backslashEscapeActive: boolean = false;

  constructor() {
    super();
    this.resetBullet();
  }

  /* utils */

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

  isBulletChar(ch: string) {
    return ch === '*' || ch === '_';
  }

  /* main */

  preFeed(ch: string, position: Position, currentNode: Node): BuildCmd {
    if (this.bulletCount && ch !== this.bulletChar) {
      // [N]
      this.bulletFollowedChar = ch;

      // decide whether the delimiter run can open/close emphasis
      let bulletRunCanOpenNode = false, bulletRunCanCloseNode = false;
      switch (this.bulletChar) {
        case '*':
          bulletRunCanOpenNode = this.bulletLeftFlanking;
          bulletRunCanCloseNode = this.bulletRightFlanking;
          break;
        case '_':
          bulletRunCanOpenNode = this.bulletLeftFlanking &&
            (!this.bulletRightFlanking || (this.bulletRightFlanking && isPunctuationChar(this.bulletPrecededChar)));
          bulletRunCanCloseNode = this.bulletRightFlanking &&
            (!this.bulletLeftFlanking || (this.bulletLeftFlanking && isPunctuationChar(this.bulletFollowedChar)));
          break;
      }

      let prevBulletCount: number = 0;
      let curtBulletCount: number = this.bulletCount;
      let backupCurrentNode: Node = currentNode; // the last node in which the new node can be inserted

      if (bulletRunCanCloseNode) { // if this bullet run can close emphasis node
        const textifyPlan: EmphasisNode[] = [];

        // then try to close the current node and all parent nodes
        while (curtBulletCount > 0) { // there are still bullets
          if (!(currentNode instanceof EmphasisNode)) {
            // must be in emphasis node. if not, restore currentNode to prepare to create new node.
            currentNode = backupCurrentNode;
            break;
          }

          const forbidenByRuleNineAndTen = (
            (currentNode.bulletOpenCanBothOpenAndClose || bulletRunCanOpenNode && bulletRunCanCloseNode) &&
            (this.bulletCount + currentNode.bulletOpenRunLength) % 3 === 0 &&
            !(this.bulletCount % 3 === 0 && currentNode.bulletOpenRunLength % 3 === 0)
          );
          const haveSameBulletChar = (currentNode.bulletChar === this.bulletChar);

          // decide whether the current bullet run can close *current* node
          if (!forbidenByRuleNineAndTen && haveSameBulletChar) {
            // handle nodes marked to textify
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
              backupCurrentNode = currentNode;
            } else {
              prevBulletCount = prevBulletCount - curtBulletCount; // > 0
              currentNode.bulletCount = prevBulletCount;

              // move children into new node
              const targetNode = generateEmphasisNodeTree(curtBulletCount, position, currentNode);
              currentNode.appendChild(targetNode);

              curtBulletCount = 0; // insert no more emphasis node
            }
          } else {
            // continue to upcast to seek for a matchable node
            textifyPlan.push(currentNode);
            const parent = currentNode.parentNode;
            currentNode = parent;
          }
        }
      }

      if (curtBulletCount > 0) {
        if (bulletRunCanOpenNode) {
          const emNode = new EmphasisNode(position);
          emNode.bulletChar = this.bulletChar;
          emNode.bulletCount = curtBulletCount;
          emNode.bulletOpenRunLength = this.bulletCount;
          emNode.bulletCloseRunLength = undefined;
          emNode.bulletOpenCanBothOpenAndClose = bulletRunCanOpenNode && bulletRunCanCloseNode;
          currentNode.appendChild(emNode);

          currentNode = emNode;
        } else {
          currentNode.appendText(repeatChar(this.bulletChar, curtBulletCount), position);
        }
      }

      this.resetBullet();
      this.bulletPrecededChar = ch;
    }

    return [
      { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode },
    ];
  }

  feed(ch: string, position: Position, currentNode: Node): BuildCmd {
    if (ch === '\\' && !this.backslashEscapeActive) {
      this.backslashEscapeActive = true;
      return;
    }

    const eol = ch === '\0';
    const isFunctionalBulletChar = this.isBulletChar(ch) && !this.backslashEscapeActive;

    /** The input-action map table
     *  =================================
     *  |bullet| ch    | >>> actions
     *  |------|-------|-----------------
     *  | *    | *     | >>> [B]
     *  | *    | _     | >>> [N] then [B]
     *  | *    | other | >>> [N]
     *  | _    | *     | >>> [N] then [B]
     *  | _    | _     | >>> [B]
     *  | _    | other | >>> [N]
     *  | none | *     | >>> [B]
     *  | none | _     | >>> [B]
     *  | none | other | >>> [C] (when meet the end of line)
     *  |------|-------|-----------------
     *  | [B] = record bullet runs
     *  | [N] = close the previous nodes and open the new node if necessary
     *  |       (located in preFeed method)
     *  | [C] = close all nodes
     *  =================================
     */

    // update this record [C]
    if (!this.bulletCount && !isFunctionalBulletChar) {
      this.bulletPrecededChar = ch;
    }

    // if meet the end of line, just close the node. [C]
    if (eol && (currentNode instanceof EmphasisNode)) {
      let parent = currentNode.parentNode;
      textifyNode(currentNode);
      return [
        BUILD_MSG_TYPE.USE, // vital for nested emphasis nodes.
        { type: BUILD_MSG_TYPE.OPEN_NODE, payload: parent }
      ];
    }

    if (isFunctionalBulletChar && !this.backslashEscapeActive) {
      // [B]
      if (this.bulletCount) {
        if (this.bulletChar === ch) this.bulletCount++;
      } else {
        this.bulletChar = ch;
        this.bulletCount = 1;
      }

      return [
        BUILD_MSG_TYPE.USE,
        { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode },
      ];
    }

    this.backslashEscapeActive = false;
    return [
      { type: BUILD_MSG_TYPE.OPEN_NODE, payload: currentNode },
    ];
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
