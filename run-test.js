/**
 * [TEMP] Run testcase
 */

require('ts-node').register();

var fs = require('fs');
var parse = require('./src/parser.ts').default;
var render = require('./src/render.ts').default;

var content = fs.readFileSync('./__testcase/spec/emphasis_and_strong_emphasis.json', { encoding: 'utf-8' });
var testcases = JSON.parse(content);

testcases.forEach(cas => {
  var source = trimInlineInput(cas.markdown);
  var ast = parse(source);
  var html = render(ast);
  if (html !== cas.html) {
    console.log(`[TESTCASE #${cas.number}]`);
    console.log(source);
    console.log('\x1b[32m' + cas.html + '\x1b[0m');
    console.log('\x1b[35m' + html     + '\x1b[0m');
    console.log('\x1b[37m\n');
  }
});


function trimInlineInput(src) {
  return src.replace(/\n+?$/, '');
}


