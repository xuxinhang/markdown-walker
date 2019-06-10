/**
 * 用于测试
 */

const fs = require('fs');
const util = require('util');
const parse = require('./src/parser.ts').default;

const mdStr = fs.readFileSync('./example-markdown.md', 'utf8');
const ast = parse(mdStr);

console.log('RESULT::\n');
console.log(util.inspect(ast, { depth: Infinity, colors: true }));
