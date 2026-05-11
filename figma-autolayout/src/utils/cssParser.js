/**
 * Parse inline CSS string into an object
 */
export function parseCSSString(cssStr) {
  const result = {};
  if (!cssStr) return result;
  cssStr.split(';').forEach(decl => {
    const [prop, ...rest] = decl.split(':');
    if (prop && rest.length) {
      const key = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[key] = rest.join(':').trim();
    }
  });
  return result;
}

/**
 * Parse a CSS pixel value to number
 */
function px(val) {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse gap shorthand: "10px 20px" or "10px"
 */
function parseGap(gap) {
  if (!gap) return { row: 0, col: 0 };
  const parts = gap.trim().split(/\s+/);
  const row = px(parts[0]);
  const col = parts.length > 1 ? px(parts[1]) : row;
  return { row, col };
}

/**
 * Parse padding shorthand into top/right/bottom/left
 */
function parsePadding(padding) {
  if (!padding) return { top: 0, right: 0, bottom: 0, left: 0 };
  const parts = padding.trim().split(/\s+/).map(px);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

/**
 * Map CSS align-items to Figma counterAxisAlignItems
 */
function mapAlignItems(val) {
  const map = {
    'flex-start': 'MIN',
    'start': 'MIN',
    'flex-end': 'MAX',
    'end': 'MAX',
    'center': 'CENTER',
    'stretch': 'STRETCH',
    'baseline': 'BASELINE',
  };
  return map[val] || 'MIN';
}

/**
 * Map CSS justify-content to Figma primaryAxisAlignItems
 */
function mapJustifyContent(val) {
  const map = {
    'flex-start': 'MIN',
    'start': 'MIN',
    'flex-end': 'MAX',
    'end': 'MAX',
    'center': 'CENTER',
    'space-between': 'SPACE_BETWEEN',
    'space-around': 'SPACE_BETWEEN',
    'space-evenly': 'SPACE_BETWEEN',
  };
  return map[val] || 'MIN';
}

/**
 * Determine sizing mode from width/height CSS value
 */
function sizingMode(val) {
  if (!val) return 'FIXED';
  if (val === '100%' || val === 'auto') return 'FILL';
  if (val.includes('%')) return 'FILL';
  return 'FIXED';
}

/**
 * Parse a single HTML element's CSS into a Figma-like node descriptor
 */
export function elementToFigmaNode(el, depth = 0) {
  const styleStr = el.getAttribute ? el.getAttribute('style') || '' : '';
  const css = parseCSSString(styleStr);
  const tag = el.tagName ? el.tagName.toLowerCase() : 'div';
  const id = el.getAttribute ? el.getAttribute('id') : null;
  const className = el.getAttribute ? el.getAttribute('class') : null;
  const name = id ? `#${id}` : className ? `.${className.split(' ')[0]}` : tag;

  const isFlexRow = css.display === 'flex' && css.flexDirection !== 'column';
  const isFlexCol = css.display === 'flex' && css.flexDirection === 'column';
  const isGrid = css.display === 'grid';
  const hasAutoLayout = isFlexRow || isFlexCol || isGrid;

  const gap = parseGap(css.gap || css.rowGap);
  const colGap = parseGap(css.columnGap || css.gap).col;
  const padding = parsePadding(
    css.padding ||
    [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft]
      .map(v => v || '0').join(' ')
  );

  // Override with individual padding props
  if (css.paddingTop) padding.top = px(css.paddingTop);
  if (css.paddingRight) padding.right = px(css.paddingRight);
  if (css.paddingBottom) padding.bottom = px(css.paddingBottom);
  if (css.paddingLeft) padding.left = px(css.paddingLeft);

  const node = {
    name,
    tag,
    depth,
    hasAutoLayout,
    layout: {
      mode: isFlexRow ? 'HORIZONTAL' : isFlexCol ? 'VERTICAL' : isGrid ? 'GRID' : 'NONE',
      direction: isFlexRow ? 'horizontal' : isFlexCol ? 'vertical' : 'none',
      gap: isFlexRow ? colGap || gap.col : gap.row,
      rowGap: gap.row,
      columnGap: colGap || gap.col,
      alignItems: mapAlignItems(css.alignItems),
      justifyContent: mapJustifyContent(css.justifyContent),
      flexWrap: css.flexWrap === 'wrap',
      padding,
    },
    sizing: {
      width: css.width || 'auto',
      height: css.height || 'auto',
      widthMode: sizingMode(css.width),
      heightMode: sizingMode(css.height),
      minWidth: css.minWidth || null,
      maxWidth: css.maxWidth || null,
    },
    style: {
      backgroundColor: css.backgroundColor || css.background || null,
      borderRadius: css.borderRadius || null,
      color: css.color || null,
      fontSize: css.fontSize || null,
      fontWeight: css.fontWeight || null,
      opacity: css.opacity || null,
      border: css.border || css.outline || null,
      boxShadow: css.boxShadow || null,
    },
    raw: css,
    children: [],
  };

  // Recurse into children
  const children = el.children ? Array.from(el.children) : [];
  node.children = children.map(child => elementToFigmaNode(child, depth + 1));

  return node;
}

/**
 * Parse HTML string into Figma node tree
 */
export function parseHTMLToFigmaTree(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="__root__">${html}</div>`, 'text/html');
    const root = doc.getElementById('__root__');
    if (!root) return null;

    const children = Array.from(root.children);
    if (children.length === 0) return null;
    if (children.length === 1) return elementToFigmaNode(children[0], 0);

    // Wrap multiple roots
    return {
      name: 'Frame',
      tag: 'div',
      depth: 0,
      hasAutoLayout: false,
      layout: { mode: 'NONE', direction: 'none' },
      sizing: { width: 'auto', height: 'auto', widthMode: 'FIXED', heightMode: 'FIXED' },
      style: {},
      raw: {},
      children: children.map(child => elementToFigmaNode(child, 1)),
    };
  } catch {
    return null;
  }
}

/**
 * Convert node tree to Figma-compatible JSON
 */
export function nodeToFigmaJSON(node) {
  if (!node) return null;
  const base = {
    type: node.hasAutoLayout ? 'FRAME' : 'FRAME',
    name: node.name,
    ...(node.hasAutoLayout && {
      layoutMode: node.layout.mode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL',
      primaryAxisSizingMode: node.sizing.widthMode === 'FILL' ? 'FIXED' : 'AUTO',
      counterAxisSizingMode: node.sizing.heightMode === 'FILL' ? 'FIXED' : 'AUTO',
      primaryAxisAlignItems: node.layout.justifyContent,
      counterAxisAlignItems: node.layout.alignItems,
      itemSpacing: node.layout.gap || 0,
      paddingTop: node.layout.padding?.top || 0,
      paddingRight: node.layout.padding?.right || 0,
      paddingBottom: node.layout.padding?.bottom || 0,
      paddingLeft: node.layout.padding?.left || 0,
    }),
    ...(node.style.backgroundColor && {
      fills: [{ type: 'SOLID', color: cssColorToFigma(node.style.backgroundColor) }]
    }),
    ...(node.sizing.width && node.sizing.widthMode === 'FIXED' && {
      width: px(node.sizing.width),
    }),
    ...(node.sizing.height && node.sizing.heightMode === 'FIXED' && {
      height: px(node.sizing.height),
    }),
    children: node.children.map(nodeToFigmaJSON).filter(Boolean),
  };
  return base;
}

function cssColorToFigma(color) {
  if (!color) return { r: 0, g: 0, b: 0, a: 1 };
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
      a: 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Generate Figma plugin code from node tree
 */
export function generatePluginCode(node) {
  if (!node) return '// No valid HTML/CSS detected';
  const json = nodeToFigmaJSON(node);
  return `// Figma Plugin Code (Auto-Layout Generator)
// Paste this in Figma Plugins > Development > New Plugin > Run script

const nodeData = ${JSON.stringify(json, null, 2)};

function createNode(data, parent) {
  const frame = figma.createFrame();
  frame.name = data.name || 'Frame';

  if (data.layoutMode) {
    frame.layoutMode = data.layoutMode;
    frame.primaryAxisAlignItems = data.primaryAxisAlignItems || 'MIN';
    frame.counterAxisAlignItems = data.counterAxisAlignItems || 'MIN';
    frame.itemSpacing = data.itemSpacing || 0;
    frame.paddingTop = data.paddingTop || 0;
    frame.paddingRight = data.paddingRight || 0;
    frame.paddingBottom = data.paddingBottom || 0;
    frame.paddingLeft = data.paddingLeft || 0;
  }

  if (data.width) frame.resize(data.width, frame.height);
  if (data.height) frame.resize(frame.width, data.height);

  if (data.fills) frame.fills = data.fills;

  parent.appendChild(frame);

  if (data.children) {
    data.children.forEach(child => createNode(child, frame));
  }

  return frame;
}

const page = figma.currentPage;
createNode(nodeData, page);
figma.closePlugin('Done! Check the canvas.');`;
}
