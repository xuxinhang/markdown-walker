
export default function render(root) {
  const tagPair = tags[root.type];
  const openTag  = tagPair ? tagPair[0] : '';
  const closeTag = tagPair ? tagPair[1] : '';

  if (root.type === 'text') {
    return root.value;
  }

  let accu = '';
  if (root.type === 'link') {
    accu += '<a';
    accu += ` href="${encodeURI(root.dest)}"`;
    accu += root.title ? ` title="${root.title}"` : '';
    accu += '>';
  } else {
    accu += openTag;
  }

  for (let node of root.children) {
    accu += render(node);
  }

  accu += closeTag;

  return accu;
}

const tags = {
  emphasis: ['<em>', '</em>'],
  strong: ['<strong>', '</strong>'],
  link: ['<a>', '</a>'],
  root: ['<p>', '</p>\n'],
};
