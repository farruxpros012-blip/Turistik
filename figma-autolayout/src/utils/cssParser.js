/**
 * Parse inline CSS string → JS object (camelCase keys)
 */
export function parseCSSString(cssStr) {
  const result = {};
  if (!cssStr) return result;
  for (const decl of cssStr.split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim();
    const val  = decl.slice(colon + 1).trim();
    if (prop && val) {
      const key = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[key] = val;
    }
  }
  return result;
}

function px(val) {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function parsePadding(css) {
  if (css.padding) {
    const parts = css.padding.trim().split(/\s+/).map(px);
    if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
  }
  return {
    top:    px(css.paddingTop)    || 0,
    right:  px(css.paddingRight)  || 0,
    bottom: px(css.paddingBottom) || 0,
    left:   px(css.paddingLeft)   || 0,
  };
}

function parseColor(val) {
  if (!val) return null;
  val = val.trim();
  if (val.startsWith('#')) {
    const hex = val.slice(1);
    if (hex.length === 3) {
      const [r,g,b] = hex.split('').map(c => parseInt(c+c,16)/255);
      return { r, g, b, a: 1 };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0,2),16)/255,
        g: parseInt(hex.slice(2,4),16)/255,
        b: parseInt(hex.slice(4,6),16)/255,
        a: hex.length === 8 ? parseInt(hex.slice(6,8),16)/255 : 1,
      };
    }
  }
  const rgb = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgb) {
    return {
      r: parseInt(rgb[1])/255,
      g: parseInt(rgb[2])/255,
      b: parseInt(rgb[3])/255,
      a: rgb[4] !== undefined ? parseFloat(rgb[4]) : 1,
    };
  }
  return null;
}

function mapAlign(val) {
  const m = { 'flex-start':'MIN', start:'MIN', 'flex-end':'MAX', end:'MAX', center:'CENTER', stretch:'STRETCH' };
  return m[val] || 'MIN';
}
function mapJustify(val) {
  const m = { 'flex-start':'MIN', start:'MIN', 'flex-end':'MAX', end:'MAX', center:'CENTER',
               'space-between':'SPACE_BETWEEN', 'space-around':'SPACE_BETWEEN', 'space-evenly':'SPACE_BETWEEN' };
  return m[val] || 'MIN';
}

export function elementToNode(el, depth = 0) {
  if (el.nodeType === 3) {
    const text = el.textContent.trim();
    if (!text) return null;
    return { type: 'TEXT', text, depth };
  }
  if (el.nodeType !== 1) return null;

  const tag = el.tagName.toLowerCase();
  const css = parseCSSString(el.getAttribute('style') || '');
  const id  = el.getAttribute('id');
  const cls = el.getAttribute('class');
  const name = id ? `#${id}` : cls ? `.${cls.split(' ')[0]}` : tag;

  const isHoriz = css.display === 'flex' && css.flexDirection !== 'column';
  const isVert  = css.display === 'flex' && css.flexDirection === 'column';
  const hasAL   = isHoriz || isVert;

  const pad = parsePadding(css);
  const bgVal = css.backgroundColor || (css.background && !css.background.includes('gradient') ? css.background : null);
  const bgColor = parseColor(bgVal);
  const textColor = parseColor(css.color || null);

  const rawW = px(css.width);
  const rawH = px(css.height);
  const wMode = css.width === '100%' || css.flex === '1' ? 'FILL' : rawW > 0 ? 'FIXED' : 'HUG';
  const hMode = css.height === '100%' ? 'FILL' : rawH > 0 ? 'FIXED' : 'HUG';
  const gap = px(css.gap || css.rowGap || '0');

  const node = {
    type: 'FRAME',
    name, tag, depth,
    hasAutoLayout: hasAL,
    layoutMode: isHoriz ? 'HORIZONTAL' : isVert ? 'VERTICAL' : 'NONE',
    primaryAxisAlignItems:  mapJustify(css.justifyContent),
    counterAxisAlignItems:  mapAlign(css.alignItems),
    itemSpacing: gap,
    paddingTop: pad.top, paddingRight: pad.right, paddingBottom: pad.bottom, paddingLeft: pad.left,
    width: rawW, height: rawH,
    widthMode: wMode, heightMode: hMode,
    cornerRadius: px(css.borderRadius),
    backgroundColor: bgColor,
    opacity: css.opacity ? parseFloat(css.opacity) : 1,
    fontSize: px(css.fontSize) || 14,
    fontWeight: parseInt(css.fontWeight) || 400,
    textColor,
    children: [],
  };

  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      const t = child.textContent.trim();
      if (t) node.children.push({ type: 'TEXT', text: t, depth: depth + 1, fontSize: node.fontSize, fontWeight: node.fontWeight, textColor });
    } else if (child.nodeType === 1) {
      const childNode = elementToNode(child, depth + 1);
      if (childNode) node.children.push(childNode);
    }
  }

  return node;
}

export function parseHTMLToFigmaTree(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="__r__">${html}</div>`, 'text/html');
    const root = doc.getElementById('__r__');
    if (!root) return null;
    const children = Array.from(root.children).map(c => elementToNode(c, 0)).filter(Boolean);
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    return {
      type: 'FRAME', name: 'Root', tag: 'div', depth: 0,
      hasAutoLayout: false, layoutMode: 'NONE',
      primaryAxisAlignItems: 'MIN', counterAxisAlignItems: 'MIN',
      itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      width: 0, height: 0, widthMode: 'HUG', heightMode: 'HUG',
      cornerRadius: 0, backgroundColor: null, opacity: 1,
      fontSize: 14, fontWeight: 400, textColor: null,
      children,
    };
  } catch {
    return null;
  }
}

export function generatePluginCode(tree) {
  if (!tree) return '// HTML topilmadi';
  const nodeJson = JSON.stringify(tree, null, 2);
  return `// ═══════════════════════════════════════════════════════
// Figma Auto-Layout Generator  (html.to.design kabi)
// Ishlatish: Plugins → Development → "Run script"
// Kodni joylashtiring → Run bosing
// ═══════════════════════════════════════════════════════

const tree = ${nodeJson};

async function loadFont(weight) {
  const style = weight >= 700 ? 'Bold' : weight >= 500 ? 'Medium' : 'Regular';
  try { await figma.loadFontAsync({ family: 'Inter', style }); return style; }
  catch { await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' }); return 'Regular'; }
}

function c(col) { return col ? { r: col.r, g: col.g, b: col.b } : { r:0,g:0,b:0 }; }

async function build(data, parent) {
  if (data.type === 'TEXT') {
    const fontStyle = await loadFont(data.fontWeight || 400);
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: fontStyle };
    t.characters = data.text || ' ';
    t.fontSize = data.fontSize || 14;
    if (data.textColor) t.fills = [{ type:'SOLID', color: c(data.textColor), opacity: data.textColor.a ?? 1 }];
    parent.appendChild(t);
    return t;
  }

  const frame = figma.createFrame();
  frame.name = data.name || 'Frame';
  frame.clipsContent = false;

  if (data.hasAutoLayout && data.layoutMode !== 'NONE') {
    frame.layoutMode = data.layoutMode;
    frame.primaryAxisAlignItems  = data.primaryAxisAlignItems  || 'MIN';
    frame.counterAxisAlignItems  = data.counterAxisAlignItems  || 'MIN';
    frame.itemSpacing     = data.itemSpacing    || 0;
    frame.paddingTop      = data.paddingTop     || 0;
    frame.paddingRight    = data.paddingRight   || 0;
    frame.paddingBottom   = data.paddingBottom  || 0;
    frame.paddingLeft     = data.paddingLeft    || 0;
    frame.primaryAxisSizingMode  = data.widthMode  === 'FIXED' ? 'FIXED' : 'AUTO';
    frame.counterAxisSizingMode  = data.heightMode === 'FIXED' ? 'FIXED' : 'AUTO';
  }

  const w = data.widthMode  === 'FIXED' && data.width  > 0 ? data.width  : 100;
  const h = data.heightMode === 'FIXED' && data.height > 0 ? data.height : 100;
  frame.resize(w, h);

  if (data.backgroundColor) {
    frame.fills = [{ type:'SOLID', color: c(data.backgroundColor), opacity: data.backgroundColor.a ?? 1 }];
  } else {
    frame.fills = [];
  }

  if (data.cornerRadius > 0) frame.cornerRadius = data.cornerRadius;
  if (data.opacity !== undefined && data.opacity < 1) frame.opacity = data.opacity;

  parent.appendChild(frame);

  for (const child of (data.children || [])) {
    const childNode = await build(child, frame);
    if (childNode && frame.layoutMode !== 'NONE') {
      if (child.widthMode  === 'FILL') childNode.layoutGrow = 1;
      if (child.heightMode === 'FILL') childNode.layoutAlignSelf = 'STRETCH';
    }
  }
  return frame;
}

(async () => {
  try {
    const root = await build(tree, figma.currentPage);
    if (root) figma.viewport.scrollAndZoomIntoView([root]);
    figma.notify('✅ Tayyor! ' + (tree.name || 'Frame') + ' yaratildi');
  } catch(e) {
    figma.notify('❌ Xato: ' + e.message, { error: true });
    console.error(e);
  } finally {
    figma.closePlugin();
  }
})();`;
}
