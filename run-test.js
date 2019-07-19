/**
 * [TEMP] Run testcase
 */

require('ts-node').register();

var fs = require('fs');
var parse = require('./src/parser.ts').default;
var render = require('./src/render.ts').default;

var content = fs.readFileSync('./__testcase/spec/emphasis_and_strong_emphasis.json', { encoding: 'utf-8' });
// var content = fs.readFileSync('./__testcase/spec/links.json', { encoding: 'utf-8' });
var testcases = JSON.parse(content);

for (const cas of testcases) {
  if (cas.number >= 522) continue;

  var source = trimInlineInput(cas.markdown);
  var paraSrc = source.split('\n\n');
  var html = paraSrc.map(src => render(parse(src))).join('');
  if (html !== cas.html) {
    console.log(`[#${cas.number}]`);
    console.log(source);
    console.log('\x1b[32m' + cas.html + '\x1b[0m');
    console.log('\x1b[35m' + html     + '\x1b[0m');
    console.log('\x1b[37m');
  }
}


function trimInlineInput(src) {
  return src.replace(/\n+?$/, '');
}


