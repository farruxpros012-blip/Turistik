figma.showUI(__html__, { width: 760, height: 560, title: 'HTML → Figma AutoLayout' });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create') {
    try {
      const root = await buildNode(msg.tree, figma.currentPage);
      if (root) figma.viewport.scrollAndZoomIntoView([root]);
      figma.notify('✅ Tayyor! "' + (msg.tree.name || 'Frame') + '" yaratildi');
    } catch (e) {
      figma.notify('❌ Xato: ' + e.message, { error: true });
      console.error(e);
    }
    figma.ui.postMessage({ type: 'done' });
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

async function loadFont(family, weight) {
  const fw = parseInt(weight) || 400;
  const style = fw >= 700 ? 'Bold' : fw >= 500 ? 'Medium' : 'Regular';
  const families = [family || 'Inter', 'Inter', 'Roboto'];
  for (const f of families) {
    try {
      await figma.loadFontAsync({ family: f, style });
      return { family: f, style };
    } catch (_) {}
  }
  await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
  return { family: 'Roboto', style: 'Regular' };
}

function toRGB(col) {
  if (!col) return { r: 0, g: 0, b: 0 };
  return { r: col.r, g: col.g, b: col.b };
}

async function buildNode(data, parent) {
  if (!data) return null;

  if (data.type === 'TEXT') {
    const fontName = await loadFont(data.fontFamily, data.fontWeight);
    const t = figma.createText();
    t.fontName = fontName;
    t.characters = data.text || ' ';
    t.fontSize = data.fontSize || 14;
    if (data.textColor) {
      t.fills = [{ type: 'SOLID', color: toRGB(data.textColor), opacity: data.textColor.a ?? 1 }];
    }
    if (data.textAlign === 'center') t.textAlignHorizontal = 'CENTER';
    else if (data.textAlign === 'right') t.textAlignHorizontal = 'RIGHT';
    parent.appendChild(t);
    return t;
  }

  const frame = figma.createFrame();
  frame.name = data.name || 'Frame';
  frame.clipsContent = false;

  if (data.backgroundColor) {
    frame.fills = [{ type: 'SOLID', color: toRGB(data.backgroundColor), opacity: data.backgroundColor.a ?? 1 }];
  } else {
    frame.fills = [];
  }

  if (data.cornerRadius > 0) frame.cornerRadius = data.cornerRadius;
  if (data.opacity !== undefined && data.opacity < 1) frame.opacity = data.opacity;

  if (data.hasAutoLayout && data.layoutMode !== 'NONE') {
    frame.layoutMode = data.layoutMode;
    frame.primaryAxisAlignItems = data.primaryAxisAlignItems || 'MIN';
    frame.counterAxisAlignItems = data.counterAxisAlignItems || 'MIN';
    frame.itemSpacing = data.itemSpacing || 0;
    frame.paddingTop = data.paddingTop || 0;
    frame.paddingRight = data.paddingRight || 0;
    frame.paddingBottom = data.paddingBottom || 0;
    frame.paddingLeft = data.paddingLeft || 0;
    frame.primaryAxisSizingMode = data.widthMode === 'FIXED' && data.width > 0 ? 'FIXED' : 'AUTO';
    frame.counterAxisSizingMode = data.heightMode === 'FIXED' && data.height > 0 ? 'FIXED' : 'AUTO';
  }

  const w = (data.widthMode === 'FIXED' && data.width > 0) ? data.width : 100;
  const h = (data.heightMode === 'FIXED' && data.height > 0) ? data.height : 100;
  frame.resize(w, h);

  parent.appendChild(frame);

  for (const child of (data.children || [])) {
    const childNode = await buildNode(child, frame);
    if (childNode && frame.layoutMode !== 'NONE') {
      if (child.widthMode === 'FILL') childNode.layoutGrow = 1;
      if (child.heightMode === 'FILL') childNode.layoutAlignSelf = 'STRETCH';
    }
  }

  return frame;
}
