// 各种节点的解析

import CONT from '../symbols';
import Node from '../nodes';
import { Position, Point } from '../nodes';

import BaseBuilder, { BUILD_MSG_TYPE } from './_base';

import ParagraphBuilder from './paragraph';
import TextBuilder from './text';
import EmphasisBuilder from './emphasis';
import StrongBuilder from './strong';

// interface Builder {
//   update: (ch: string, point: Point) => any, // [TODO]
//   [prop: string]: any;
// };

const builders = new Map<string, typeof BaseBuilder>();
builders.set('paragraph', ParagraphBuilder);
// builders.set('strong', StrongBuilder);
builders.set('emphasis', EmphasisBuilder);
builders.set('text', TextBuilder);

export default builders;

export { BaseBuilder as Builder };

export { BUILD_MSG_TYPE };

