import BaseBuilder from './_base';
import { Point, Position, findParentNode, removeAllChildren, yankChildNode } from '../utils';
import Node, { CodeSpanNode } from '../nodes';
import { BuildState, BuildCommand, Token, TokenTypes } from '../cmd';
import { nodeModuleNameResolver } from 'typescript';

const CODE_SPAN_PRECEDENCE = 99;


export default class CodeSpanBuilder extends BaseBuilder {
  backtickRunCount: number;
  backtickRunBeginPoint: Point;
  backtickRunEndPoint: Point;
  codeSpanContentCache: string;

  private resetInnerState() {
    this.backtickRunCount = 0;
    this.backtickBeginRunPoint = null;
    this.backtickBeginRunCount = 0;
    this.codeSpanContentCache = '';
  }

  private resetBacktickCount() {
    this.backtickRunCount = 0;
  }

  constructor() {
    super();
    this.resetInnerState();
  }

  feed(ch: string, position: Position, currentNode: Node, innerEnd: boolean, state: BuildState, token: Token): BuildCommand {

    if (token.type === TokenTypes.RequestClose) {
      if (currentNode instanceof CodeSpanNode) {
        if (token.payload.source !== `code_span;runCount=${currentNode.backtickRunCount}`) {
          const runCount = currentNode.backtickRunCount;
          const parent = currentNode.parentNode;
          parent.insertTextBefore(currentNode, '`'.repeat(runCount), position);
          yankChildNode(currentNode);
          return { node: parent };
        }
      }
      return;
    }

    if (ch === '`') {
      if (this.backtickRunCount) {
        this.backtickRunCount++;
        return { use: true };
      } else {
        this.backtickRunCount = 1;
        this.backtickRunBeginPoint = position.start;
        return { use: true };
      }
    }

    // this is not a backtick character
    if (this.backtickRunCount > 0) {
      const matchedCodeSpanNode = <CodeSpanNode>findParentNode(
        currentNode,
        node => (node instanceof CodeSpanNode) && node.backtickRunCount === this.backtickRunCount,
      );

      if (matchedCodeSpanNode) {
        // [TODO] append char to the caches of level-higher code-span nodes
        this.appendToCachesOfAllParentCodeSpanNodes(matchedCodeSpanNode.parentNode, '`'.repeat(this.backtickRunCount));

        while (true) {
          if (currentNode === matchedCodeSpanNode) {
            const node = matchedCodeSpanNode;
            removeAllChildren(node);
            // write some other props to this node
            this.resetBacktickCount();
            node.value = node.contentCache;
            return { node: node.parentNode };
          } else if (currentNode instanceof CodeSpanNode) {
            const runCount = currentNode.backtickRunCount;
            const parent = currentNode.parentNode;
            parent.insertTextBefore(currentNode, '`'.repeat(runCount), position);
            yankChildNode(currentNode);
            currentNode = parent;
          } else {
            state.requestClose(CODE_SPAN_PRECEDENCE, `code_span;runCount=${this.backtickRunCount}`);
            // return { use: true, moveTo: skipBeginPoint, monopoly: false };
            return;
          }
        }

      } else {
        this.appendToCachesOfAllParentCodeSpanNodes(currentNode, '`'.repeat(this.backtickRunCount));
        const node = new CodeSpanNode(position);
        node.backtickRunCount = this.backtickRunCount;
        currentNode.appendChild(node);
        this.appendToCachesOfAllParentCodeSpanNodes(node, ch);

        this.resetBacktickCount();
        return { node: node };
      }
    } else {
      // const lastCodeSpanNode = findParentNode(currentNode, n => n instanceof CodeSpanNode);
      this.appendToCachesOfAllParentCodeSpanNodes(currentNode, ch);
      return;
    }
  }

  private appendToCachesOfAllParentCodeSpanNodes(sourceNode: Node, character: string) {
    for (let node = sourceNode; node; node = node.parentNode) {
      if (node instanceof CodeSpanNode) {
        node.contentCache += character;
      }
    }
  }

}





