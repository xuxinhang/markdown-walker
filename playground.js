/**
 * 用于测试
 */

require('ts-node').register();

const fs = require('fs');
const util = require('util');
const inspector = require('inspector');
const http = require('http');

const parse = require('./src/parser.ts').default;
const render = require('./src/render.ts').default;

function run(src) {
  const ast = parse(src);
  return ast;
}

var cases = [];

try {
  var cs = require('./__playground_testcases.js');
  cases.splice(0, 0, ...cs);
} catch (e) {
  console.warn('No playground case file found.');
}

cases.forEach(item => {
  console.log(item);
  const ast = run(item);
  console.log(util.inspect(ast, {
    showHiddle: false,
    depth: Infinity,
    colors: true,
    // customInspect: false,
  }));
  console.log(render(ast));
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
