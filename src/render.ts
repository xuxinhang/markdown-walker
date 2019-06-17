
export default function render(root) {
  const tagPair = tags[root.type];
  const openTag  = tagPair ? tagPair[0] : '';
  const closeTag = tagPair ? tagPair[1] : '';

  if (root.type === 'text') {
    return root.value;
  }

  let accu = '';
  accu += openTag;
  for (let node of root.children) {
    accu += render(node);
  }
  accu += closeTag;

  return accu;
}

const tags = {
  emphasis: ['<em>', '</em>'],
  strong: ['<strong>', '</strong>'],
  root: ['<p>', '</p>\n'],
};
