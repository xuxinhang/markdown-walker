import entityMap from 'entities/maps/entities.json';
import BaseBuilder from './_base';
import { Point, Position } from '../utils';
import Node from '../nodes';
import { BuildCommand } from '../cmd';

enum EntityType { None, Name, Dec, Hex };
type AppendCharFunction = (ch: string, node?: Node, pos?: Position) => any;

export class CustomEntityBuidler extends BaseBuilder {
  private startPoint: Point;
  private lastStartOffset: number;
  private entityType: EntityType;
  private entityName: string;
  private entityCode: number;
  private entityCodeDigital: number;
  public appendChar: AppendCharFunction;

  constructor(appendCharFn?: AppendCharFunction) {
    super();
    this.resetInnerState();
    this.appendChar = appendCharFn || (() => {});
  }

  private resetInnerState() {
    this.startPoint = null;
    this.lastStartOffset = undefined;
    this.entityType = EntityType.None;
    this.entityName = '';
    this.entityCode = undefined;
    this.entityCodeDigital = 0;
  }

  feed(ch: string, position: Position, currentNode: Node): BuildCommand {
    if (this.lastStartOffset === position.start.offset) return;

    let rollback = false;
    let finish = false;

    switch (this.entityType) {
      case EntityType.None:
        if (ch === '&') {
          this.entityType = EntityType.Name;
          this.startPoint = position.start;
          return { use: true };
        }
        return; // break;
      case EntityType.Name:
        if (ch === ';') {
          if (this.entityName && entityMap[this.entityName]) {
            this.appendChar(entityMap[this.entityName], currentNode, position);
          } else {
            rollback = true;
            break;
          }
          finish = true;
          break;
        }
        if (ch === '#' && !this.entityName) {
          this.entityType = EntityType.Dec;
          return { use: true };
        }
        if (!isValidEntityNameChar(ch)) {
          rollback = true;
          break;
        }
        this.entityName += ch;
        break;

      case EntityType.Dec:
        if (ch === ';') {
          if (this.entityCodeDigital < 1 || this.entityCodeDigital > 7) {
            rollback = true;
            break;
          }
          this.appendChar(getEntityDisplayChar(this.entityCode), currentNode, position);
          finish = true;
          break;
        }
        if ((ch == 'x' || ch === 'X') && this.entityCode === undefined) {
          this.entityType = EntityType.Hex;
          return { use: true };
        }
        const d = parseInt(ch, 10);
        if (isNaN(d)) {
          rollback = true;
          break;
        }
        this.entityCode = (this.entityCode === undefined ? 0 : this.entityCode) * 10 + d;
        this.entityCodeDigital++;
        break;

      case EntityType.Hex:
        if (ch === ';') {
          if (this.entityCodeDigital < 1 || this.entityCodeDigital > 6) {
            rollback = true;
            break;
          }
          this.appendChar(getEntityDisplayChar(this.entityCode), currentNode, position);
          finish = true;
          break;
        }
        if (ch === '#' && this.entityCode === undefined) {
          this.entityType = EntityType.Dec;
          return { use: true };
        }
        const h = parseInt(ch, 16);
        if (isNaN(h)) {
          rollback = true;
          break;
        }
        this.entityCode = (this.entityCode === undefined ? 0 : this.entityCode) << 4 | h;
        this.entityCodeDigital++;
        break;
    }

    if (rollback) {
      const start = this.startPoint;
      this.lastStartOffset = start.offset;
      this.startPoint = null;
      this.entityType = EntityType.None;
      this.entityName = '';
      this.entityCode = undefined;
      this.entityCodeDigital = 0;
      return { use: true, moveTo: start };
    }

    if (finish) {
      this.startPoint = null;
      this.entityType = EntityType.None;
      this.entityName = '';
      this.entityCode = undefined;
      this.entityCodeDigital = 0;
      return { use: true };
    }

    return { use: true };
  }
}

function isValidEntityNameChar(s: string) {
  const c = s.charCodeAt(0);
  return 97<=c&&c<=122 || 65<=c&&c<=90 || 48<=c&&c<=57;
}


// function decodeentity(ent: string): string {
//   if (ent.startsWith('#x') || ent.startsWith('#X')) {
//     const code = parseInt(ent.slice(2), 16);
//     return isValidEntityCode(code) ? fromCodePoint(code) : '\ufffd';
//   } else if (ent.startsWith('#')) {
//     const code = parseInt(ent.slice(1), 10);
//     return isValidEntityCode(code) ? fromCodePoint(code) : '\ufffd';
//   } else {
//     const char = entityMap[ent];
//     return char;
//   }
// }

// [TODO]: the pollify for String.fromCodePoint
function fromCodePoint(c) {
  if (c > 0xffff) {
    c -= 0x10000;
    var surrogate1 = 0xd800 + (c >> 10),
        surrogate2 = 0xdc00 + (c & 0x3ff);

    return String.fromCharCode(surrogate1, surrogate2);
  }
  return String.fromCharCode(c);
}

function getEntityDisplayChar(code: number) {
  return String.fromCodePoint(isValidCodePoint(code) ? code : 0xFFFD);
}

function isValidCodePoint(c: number) {
  /**
   * https://stackoverflow.com/a/37014283/9745980
   * https://www.w3.org/TR/xml/#NT-CharRef
   */

  // basic character range
  // - any Unicode character, excluding the surrogate blocks, FFFE, and FFFF.
  if (c <= 0x8) return false;
  if (c === 0xB || c === 0xC) return false;
  if (c >= 0x0E && c <= 0x1F) return false;
  if (c >= 0xD800 && c <= 0xDFFF) return false;
  // c === 0xFFFE || c === 0xFFFF
  if (c > 0x10FFFF) return false;

  // avoid "compatibility characters"
  if (c >= 0x7F && c <= 0x84) return false;
  if (c >= 0x86 && c <= 0x9F) return false;
  if (c >= 0xFDD0 && c <= 0xFDEF) return false;
  if ((c & 0xFFFE) === 0xFFFE) return false;

  return true;
}

export default class EntityBuidler extends CustomEntityBuidler {
  constructor() {
    super();
    this.appendChar = this.__appendChar;
  }

  protected __appendChar(ch: string, node: Node, pos: Position) {
    node.appendText(ch, pos);
  }
}

