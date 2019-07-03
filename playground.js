/**
 * 用于测试
 */

require('ts-node').register();

const fs = require('fs');
const util = require('util');
const inspector = require('inspector');
const http = require('http');

const parse = require('./src/parser.ts').default;


// const mdStr = fs.readFileSync('./__example-markdown.md', 'utf8');
// const ast = parse(mdStr);

function run(src) {
  const ast = parse(src);
  return ast;
}

var cases = [
  // '_A __B__C_',
  // 'foo **_**',
  // 'foo*',
  // '*foo _bar* baz_',
  // '*A**B**C*',
  '[A](x)*',
  // '[[#]ABC](xyz)',
];

cases.forEach(item => {
  console.log(item);
  console.log(util.inspect(run(item), {
    showHiddle: false,
    depth: Infinity,
    colors: true,
    // customInspect: false,
  }));
});

return;

const session = new inspector.Session();
session.connect();

session.post('Profiler.enable', () => {
  // session.post('Profiler.start');
});

Math.run = run;

session.on('Profiler.consoleProfileStarted', () => {
  // console.log('start');

  run();

  // session.post('Profiler.enable', () => {
  //   session.post('Profiler.start', () => {
  //     session.post('Profiler.stop', (err, { profile }) => {
  //       console.log('profile-end');
  //     });
  //   });
  // });
});

const server = http.createServer(() => {
  // nothing
});
server.listen();
