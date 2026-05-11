export function domToSVG(iframeDoc) {
  const win  = iframeDoc.defaultView;
  const body = iframeDoc.body;
  const rootEl = body.firstElementChild || body;
  const rootRect = rootEl.getBoundingClientRect();

  const W  = Math.ceil(rootRect.width)  || 800;
  const H  = Math.ceil(rootRect.height) || 600;
  const ox = rootRect.left;
  const oy = rootRect.top;

  const parts = [];

  function traverse(el) {
    const cs   = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const x  = +(rect.left   - ox).toFixed(2);
    const y  = +(rect.top    - oy).toFixed(2);
    const w  = +rect.width.toFixed(2);
    const h  = +rect.height.toFixed(2);
    const op = parseFloat(cs.opacity) ?? 1;
    const br = parseFloat(cs.borderRadius) || 0;
    const bw = parseFloat(cs.borderWidth)  || 0;
    const bg = cs.backgroundColor;
    const bc = cs.borderColor;

    const baseAttrs =
      `x="${x}" y="${y}" width="${w}" height="${h}"` +
      (br > 0 ? ` rx="${br}"` : '') +
      (op < 1 ? ` opacity="${op}"` : '');

    if (visible(bg)) parts.push(`<rect ${baseAttrs} fill="${bg}"/>`);
    if (bw > 0 && visible(bc)) parts.push(`<rect ${baseAttrs} fill="none" stroke="${bc}" stroke-width="${bw}"/>`);

    const fontSize  = parseFloat(cs.fontSize)  || 14;
    const lineH     = parseFloat(cs.lineHeight) || fontSize * 1.4;
    const color     = cs.color;
    const fontW     = cs.fontWeight;
    const fontF     = (cs.fontFamily.split(',')[0] || 'sans-serif').replace(/['"]/g, '').trim();
    const textAlign = cs.textAlign;
    const pl        = parseFloat(cs.paddingLeft) || 0;
    const pt        = parseFloat(cs.paddingTop)  || 0;

    let txBase = x + pl;
    let anchor = 'start';
    if (textAlign === 'center') { txBase = x + w / 2; anchor = 'middle'; }
    if (textAlign === 'right' || textAlign === 'end') { txBase = x + w - pl; anchor = 'end'; }

    for (const child of el.childNodes) {
      if (child.nodeType !== 3) continue;
      const raw = child.textContent;
      if (!raw.trim()) continue;

      const words = raw.trim().split(/\s+/);
      const maxW  = w - pl * 2 || w;
      const lines = [];
      let line = '';
      for (const word of words) {
        const candidate = line ? line + ' ' + word : word;
        if (candidate.length * fontSize * 0.55 > maxW && line) {
          lines.push(line); line = word;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);

      lines.forEach((ln, i) => {
        const ty = +(y + pt + fontSize + i * lineH).toFixed(2);
        if (visible(color)) {
          parts.push(
            `<text x="${txBase.toFixed(2)}" y="${ty}" ` +
            `font-size="${fontSize}" fill="${color}" ` +
            `font-weight="${fontW}" font-family="${fontF}" ` +
            `text-anchor="${anchor}">${esc(ln)}</text>`
          );
        }
      });
    }

    for (const child of el.children) traverse(child);
  }

  traverse(rootEl);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n` +
    parts.join('\n') +
    `\n</svg>`
  );
}

function visible(c) {
  if (!c) return false;
  if (c === 'transparent') return false;
  if (c.startsWith('rgba') && c.endsWith(', 0)')) return false;
  return true;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
