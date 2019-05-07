// 各种节点的解析

const CONT = require('./symbols');
const Node = require('./nodes');
import { Position, Point } from '../nodes';

import ParagraphBuilder from './paragraph';
import TextBuilder from './text';

interface Builder {
  update: (ch: string, point: Point) => any, // [TODO]
  [prop: string]: any;
};

const builders = new Map<string, Builder>();

/* builders.set('heading', {
  sharpAcceptable: true,
  sharpCounter: 0,
  position: new Position(),
  update() {
    // [TODO]
  },
  glance(ch, point) {
    if (this.sharpAcceptable === false || ch !== '#') {
      return false;
    }
    // if (ch === '\n') {
    //   this.sharpAcceptable = true;
    //   this.sharpCounter = 0;
    //   return false;
    // }

    // Here, sharpAcceptable === true && ch === '#'.
    // this.sharpAcceptable = true;
    this.sharpCounter = 1;
    this.position = new Position(point, point);
    let state = 'sharp';

    return (ch, point) => {
      if (ch === '\n') {
        this.sharpAcceptable = true;
        this.sharpCounter = 0;
        this.position.setEnd(point);
        return CONT.NODE_END;
      }

      if (ch === '#' && state === 'sharp') {
        this.sharpCounter = +this.sharpCounter + 1;
        // If more than six sharp symbols
        if (this.sharpCounter > 6) return false;
        return true;
      }

      if ((state === 'sharp' || state === 'space') && ch === ' ') {
        state = 'spaces';
        return true;
      }

      if (state === 'space') {
        state = 'content';
      }

      if (state === 'sharp') { // Here, ch is neither ' ' nor '#'.
        return false;
      }

      if (state === 'content') {
        return true;
      }

      this.sharpAcceptable = false;
      this.sharpCounter = 0;
      return new Node.Heading({
        depth: this.sharpCounter,
        position: this.position,
      });
    };
  },
}); */


builders.set('paragraph', new ParagraphBuilder());

builders.set('text', );


export default builders;

