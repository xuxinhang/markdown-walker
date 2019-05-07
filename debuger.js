/**
 * 用于测试
 */

const fs = require('fs');
const parser = require('./src/parser.ts');

const mdStr = fs.readFileSync('./example-markdown.md', 'utf8');
const ast = parser(mdStr);

console.log('RESULT::\n');
console.log(ast);
