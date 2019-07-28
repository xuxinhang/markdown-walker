
export default function render(root) {
  const tagPair = tags[root.type];
  const openTag  = tagPair ? tagPair[0] : '';
  const closeTag = tagPair ? tagPair[1] : '';

  if (root.type === 'text') {
    return replaceEntityChars(root.value);
  }

  let accu = '';
  if (root.type === 'link') {
    accu += '<a';
    accu += ` href="${processLinkDest(root.dest)}"`;
    accu += root.title ? ` title="${replaceEntityChars(root.title)}"` : '';
    accu += '>';
  } else if (root.type === 'autolink') {
    const text = replaceEntityChars(root.dest);
    const href = processLinkDest(root.dest);
    accu += `<a href="${root.linkType === 'email' ? 'mailto:' + href : href}">${text}</a>`;
  } else {
    accu += openTag;
  }

  if (root.type === 'codeSpan') {
    accu += replaceEntityChars(root.value);
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
  codeSpan: ['<code>', '</code>'],
};

function replaceEntityChars(s: string): string {
  return s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processLinkDest(dest: string): string {
  return replaceEntityChars(encodeURI(decodeURI(dest)));
}
