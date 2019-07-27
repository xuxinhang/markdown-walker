import Node, { TextNode, Position, CodeSpanNode } from "../nodes";
import util from 'util';

const inspectableProps = [/*'position'*/, 'innerData', 'bulletChar', 'bulletCount', 'title', 'dest', 'linkType'];

export function inspectNodeTree(root: Node, expectedParentNode: Node = null) {
  const proto = Object.getPrototypeOf(root);
  const className = proto.constructor.name;

  const childContent = root.children.map(node => {
    return inspectNodeTree(node, root);
  });

  let first = '', body = '', cont = '';

  first += `\x1b[44;37m${className} ${root.type}\x1b[0m `;
  first += expectedParentNode && root.parentNode !== expectedParentNode ? '\x1b[41;37mWRONG_PARENT\x1b[0m ' : ' ';
  if (root instanceof TextNode) {
    first += `\x1b[32m“${root.value}”\x1b[0m`;
  }
  if (root instanceof CodeSpanNode) {
    first += `\x1b[32m“${root.value}”\x1b[0m`;
  }
  // first += root.position;

  const otherProps = Object.entries(root).reduce((accu, [key, value]) => {
    if (inspectableProps.indexOf(key) > -1) accu[key] = value;
    return accu;
  }, {});
  cont += util.formatWithOptions({ colors: true, compact: true }, '%O', otherProps);

  body += childContent.length
    ? childContent.join('\n').split('\n').map(line => '\t' + line).join('\n')
    : '';

  return [first, cont, body].filter(Boolean).join('\n');
}

