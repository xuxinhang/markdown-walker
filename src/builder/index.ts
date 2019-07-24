/**
 * 各种节点的解析
 */

import BaseBuilder, { BUILD_MSG_TYPE } from './_base';

// import ParagraphBuilder from './paragraph';
import TextBuilder from './text';
import EmphasisBuilder from './emphasis';
// import StrongBuilder from './strong';
import LinkBuilder from './link';
import EntityBuidler from './entity';
import CodeSpanBuilder from './code-span';

// interface Builder {
//   update: (ch: string, point: Point) => any, // [TODO]
//   [prop: string]: any;
// };

const builders = new Map<string, typeof BaseBuilder>();
// builders.set('paragraph', ParagraphBuilder);
// builders.set('strong', StrongBuilder);
builders.set('link', LinkBuilder);
builders.set('emphasis', EmphasisBuilder);
builders.set('text', TextBuilder);
builders.set('entity', EntityBuidler);
builders.set('code_span', CodeSpanBuilder);

export default builders;

export { BaseBuilder as Builder };

export { BUILD_MSG_TYPE };

