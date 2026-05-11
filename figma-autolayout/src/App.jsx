import { useState, useRef } from 'react';
import JSZip from 'jszip';
import './App.css';

// ─── CSS parser (same logic as plugin ui.html) ────────────────────────────────
function parseCSSString(str) {
  const r = {};
  if (!str) return r;
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim();
    const v = decl.slice(i + 1).trim();
    if (k && v) r[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return r;
}
const px = v => { if (!v) return 0; const n = parseFloat(v); return isNaN(n) ? 0 : n; };

function parsePadding(css) {
  if (css.padding) {
    const p = css.padding.trim().split(/\s+/).map(px);
    if (p.length === 1) return { top: p[0], right: p[0], bottom: p[0], left: p[0] };
    if (p.length === 2) return { top: p[0], right: p[1], bottom: p[0], left: p[1] };
    if (p.length === 3) return { top: p[0], right: p[1], bottom: p[2], left: p[1] };
    return { top: p[0], right: p[1], bottom: p[2], left: p[3] };
  }
  return {
    top: px(css.paddingTop) || 0, right: px(css.paddingRight) || 0,
    bottom: px(css.paddingBottom) || 0, left: px(css.paddingLeft) || 0,
  };
}

function parseColor(val) {
  if (!val) return null;
  val = val.trim();
  if (val === 'transparent' || val === 'none') return null;
  if (val.startsWith('#')) {
    const h = val.slice(1);
    if (h.length === 3) return { r: parseInt(h[0]+h[0], 16)/255, g: parseInt(h[1]+h[1], 16)/255, b: parseInt(h[2]+h[2], 16)/255, a: 1 };
    if (h.length >= 6) return {
      r: parseInt(h.slice(0,2), 16)/255, g: parseInt(h.slice(2,4), 16)/255, b: parseInt(h.slice(4,6), 16)/255,
      a: h.length === 8 ? parseInt(h.slice(6,8), 16)/255 : 1,
    };
  }
  const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (m) return { r: parseInt(m[1])/255, g: parseInt(m[2])/255, b: parseInt(m[3])/255, a: m[4] !== undefined ? parseFloat(m[4]) : 1 };
  const named = { white: {r:1,g:1,b:1,a:1}, black: {r:0,g:0,b:0,a:1}, red: {r:1,g:0,b:0,a:1}, blue: {r:0,g:0,b:1,a:1}, green: {r:0,g:.5,b:0,a:1}, gray: {r:.5,g:.5,b:.5,a:1}, grey: {r:.5,g:.5,b:.5,a:1} };
  return named[val.toLowerCase()] || null;
}

const mapAlign = v => ({ start: 'MIN', 'flex-start': 'MIN', end: 'MAX', 'flex-end': 'MAX', center: 'CENTER', stretch: 'STRETCH' }[v] || 'MIN');
const mapJustify = v => ({ start: 'MIN', 'flex-start': 'MIN', end: 'MAX', 'flex-end': 'MAX', center: 'CENTER', 'space-between': 'SPACE_BETWEEN', 'space-around': 'SPACE_BETWEEN', 'space-evenly': 'SPACE_BETWEEN' }[v] || 'MIN');

function elementToNode(el, depth) {
  if (el.nodeType === 3) {
    const t = el.textContent.trim();
    return t ? { type: 'TEXT', text: t, depth, fontSize: 14, fontWeight: 400, textColor: null } : null;
  }
  if (el.nodeType !== 1) return null;

  const tag = el.tagName.toLowerCase();
  const css = parseCSSString(el.getAttribute('style') || '');
  const id = el.getAttribute('id');
  const cls = el.getAttribute('class');
  const name = id ? '#' + id : cls ? '.' + cls.split(' ')[0] : tag;

  const isH = css.display === 'flex' && css.flexDirection !== 'column';
  const isV = css.display === 'flex' && css.flexDirection === 'column';
  const pad = parsePadding(css);
  const bgVal = css.backgroundColor || (css.background && !css.background.includes('gradient') ? css.background : null);
  const bg = parseColor(bgVal);
  const tc = parseColor(css.color || null);
  const ff = (css.fontFamily || 'Inter').split(',')[0].replace(/['"]/g, '').trim();
  const fs = px(css.fontSize) || 14;
  const fw = parseInt(css.fontWeight) || 400;
  const ta = css.textAlign || 'left';

  const rawW = px(css.width);
  const rawH = px(css.height);
  const wMode = css.width === '100%' || css.flex === '1' ? 'FILL' : rawW > 0 ? 'FIXED' : 'HUG';
  const hMode = css.height === '100%' ? 'FILL' : rawH > 0 ? 'FIXED' : 'HUG';
  const gap = px(css.gap || css.rowGap || '0');

  const node = {
    type: 'FRAME', name, tag, depth,
    hasAutoLayout: isH || isV,
    layoutMode: isH ? 'HORIZONTAL' : isV ? 'VERTICAL' : 'NONE',
    primaryAxisAlignItems: mapJustify(css.justifyContent),
    counterAxisAlignItems: mapAlign(css.alignItems),
    itemSpacing: gap,
    paddingTop: pad.top, paddingRight: pad.right, paddingBottom: pad.bottom, paddingLeft: pad.left,
    width: rawW, height: rawH, widthMode: wMode, heightMode: hMode,
    cornerRadius: px(css.borderRadius),
    backgroundColor: bg,
    opacity: css.opacity ? parseFloat(css.opacity) : 1,
    fontSize: fs, fontWeight: fw, fontFamily: ff, textAlign: ta, textColor: tc,
    children: [],
  };

  for (const child of el.childNodes) {
    if (child.nodeType === 3) {
      const t = child.textContent.trim();
      if (t) node.children.push({ type: 'TEXT', text: t, depth: depth + 1, fontSize: fs, fontWeight: fw, fontFamily: ff, textAlign: ta, textColor: tc });
    } else if (child.nodeType === 1) {
      const cn = elementToNode(child, depth + 1);
      if (cn) node.children.push(cn);
    }
  }
  return node;
}

function parseHTMLToTree(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div id="__r__">' + html + '</div>', 'text/html');
    const root = doc.getElementById('__r__');
    if (!root) return null;
    const children = Array.from(root.children).map(c => elementToNode(c, 0)).filter(Boolean);
    if (!children.length) return null;
    if (children.length === 1) return children[0];
    return {
      type: 'FRAME', name: 'Root', tag: 'div', depth: 0,
      hasAutoLayout: false, layoutMode: 'NONE',
      primaryAxisAlignItems: 'MIN', counterAxisAlignItems: 'MIN',
      itemSpacing: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      width: 0, height: 0, widthMode: 'HUG', heightMode: 'HUG',
      cornerRadius: 0, backgroundColor: null, opacity: 1,
      fontSize: 14, fontWeight: 400, fontFamily: 'Inter', textAlign: 'left', textColor: null,
      children,
    };
  } catch { return null; }
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | copied | error
  const [fileName, setFileName] = useState('');
  const [tree, setTree] = useState(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setStatus('idle'); setFileName(''); setTree(null);
    setPreviewHTML(''); setError('');
  };

  const processZip = async (file) => {
    setStatus('loading'); setFileName(file.name); setError('');
    try {
      const zip = await JSZip.loadAsync(file);
      const htmlFile = Object.keys(zip.files).find(n => /index\.html?$/i.test(n))
                   || Object.keys(zip.files).find(n => /\.html?$/i.test(n));
      if (!htmlFile) throw new Error('ZIP ichida HTML fayl topilmadi');

      let html = await zip.files[htmlFile].async('string');

      const cssFiles = Object.keys(zip.files).filter(n => n.endsWith('.css'));
      const cssParts = [];
      for (const f of cssFiles) cssParts.push(await zip.files[f].async('string'));
      if (cssParts.length && html.includes('</head>')) {
        html = html.replace('</head>', '<style>' + cssParts.join('\n') + '</style></head>');
      } else if (cssParts.length) {
        html = '<style>' + cssParts.join('\n') + '</style>' + html;
      }

      const parsedTree = parseHTMLToTree(html);
      if (!parsedTree) throw new Error('HTML strukturasini o\'qib bo\'lmadi');

      setTree(parsedTree);
      setPreviewHTML(html);
      setStatus('ready');
    } catch (e) {
      setError(e.message); setStatus('error');
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Faqat .zip fayl qabul qilinadi'); setStatus('error'); return;
    }
    processZip(file);
  };

  const handleCopy = async () => {
    if (!tree) return;
    try {
      const payload = JSON.stringify({ __figmaAutoLayout: true, tree });
      await navigator.clipboard.writeText(payload);
      setStatus('copied');
      setTimeout(() => setStatus('ready'), 2500);
    } catch (e) {
      setError('Clipboard\'ga yozib bo\'lmadi: ' + e.message);
    }
  };

  const downloadPlugin = async () => {
    try {
      const [manifest, codeJs, uiHtml] = await Promise.all([
        fetch('/plugin/manifest.json').then(r => r.text()),
        fetch('/plugin/code.js').then(r => r.text()),
        fetch('/plugin/ui.html').then(r => r.text()),
      ]);
      const zip = new JSZip();
      zip.file('manifest.json', manifest);
      zip.file('code.js', codeJs);
      zip.file('ui.html', uiHtml);
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'html-figma-autolayout-plugin.zip'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Plugin yuklab olishda xato: ' + e.message);
    }
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logoRow}>
          <div style={S.logoIcon}>⚡</div>
          <div>
            <div style={S.logoTitle}>HTML → Figma AutoLayout</div>
            <div style={S.logoSub}>ZIP → Copy → Figma</div>
          </div>
        </div>
        <button onClick={downloadPlugin} style={S.pluginBtn}>
          ⬇️ Plugin yuklab olish
        </button>
      </header>

      <main style={S.main}>
        {status === 'idle' || status === 'error' ? (
          <div style={S.dropWrap}>
            <div
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                ...S.drop,
                borderColor: status === 'error' ? '#f38ba8' : dragOver ? '#89b4fa' : '#45475a',
                background: status === 'error' ? '#f38ba81a' : dragOver ? '#89b4fa14' : '#181825',
              }}
            >
              <input ref={fileRef} type="file" accept=".zip" hidden
                onChange={e => handleFile(e.target.files[0])} />
              <div style={S.dropIcon}>📦</div>
              <h2 style={S.dropTitle}>
                {status === 'error' ? '❌ ' + error : 'ZIP faylni shu yerga tashlang'}
              </h2>
              <p style={S.dropSub}>
                yoki bosib tanlang · HTML + CSS qabul qilinadi
              </p>
              <div style={S.dropBtn}>Fayl tanlash</div>
            </div>

            <div style={S.steps}>
              {[
                ['1', 'ZIP yuklang', 'HTML + CSS bilan'],
                ['2', 'Copy bosing', 'Clipboard\'ga'],
                ['3', 'Pluginda Paste', 'Auto-layout tayyor ✨'],
              ].map(([n, t, s]) => (
                <div key={n} style={S.step}>
                  <div style={S.stepN}>{n}</div>
                  <div style={S.stepT}>{t}</div>
                  <div style={S.stepS}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        ) : status === 'loading' ? (
          <div style={S.center}>
            <div style={S.spinner} />
            <p style={S.loadingTxt}>{fileName} o'qilmoqda…</p>
          </div>
        ) : (
          <div style={S.resultWrap}>
            <div style={S.previewPane}>
              <div style={S.paneHeader}>
                <span style={S.paneLabel}>📄 {fileName}</span>
                <button onClick={reset} style={S.resetBtn}>✕ Boshqa fayl</button>
              </div>
              <div style={S.iframeWrap}>
                <iframe srcDoc={previewHTML} sandbox="allow-scripts"
                  style={S.iframe} title="preview" />
              </div>
            </div>

            <div style={S.actionPane}>
              <div style={S.copyBox}>
                <div style={S.successBadge}>✅ Tayyor!</div>
                <h2 style={S.copyTitle}>HTML parse qilindi</h2>
                <p style={S.copyDesc}>
                  Endi <strong>Copy</strong> tugmasini bosing va Figma plugin'ida
                  "Clipboard'dan o'qish" tugmasini bosing.
                </p>

                <button onClick={handleCopy}
                  style={{
                    ...S.bigCopy,
                    background: status === 'copied'
                      ? 'linear-gradient(135deg,#a6e3a1,#94e2d5)'
                      : 'linear-gradient(135deg,#89b4fa,#cba6f7)',
                  }}>
                  {status === 'copied' ? '✅ Clipboard\'ga olindi!' : '📋 Copy'}
                </button>

                <div style={S.divider} />

                <div style={S.flowBox}>
                  <div style={S.flowTitle}>Keyingi qadam:</div>
                  <ol style={S.flowList}>
                    <li>Figma'ni oching</li>
                    <li><strong>Plugins → HTML → Figma AutoLayout</strong></li>
                    <li><strong>"Clipboard'dan o'qish"</strong> tugmasini bosing</li>
                    <li>✨ Auto-layout frame'lar paydo bo'ladi</li>
                  </ol>
                </div>

                <button onClick={downloadPlugin} style={S.pluginSmall}>
                  Plugin hali o'rnatilmagan? ⬇️ Yuklab oling
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const S = {
  root: { minHeight: '100vh', background: '#1e1e2e', color: '#cdd6f4',
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 32px', background: '#181825', borderBottom: '1px solid #313244' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { width: 32, height: 32, background: 'linear-gradient(135deg,#89b4fa,#cba6f7)',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  logoTitle: { fontSize: 14, fontWeight: 700 },
  logoSub: { fontSize: 11, color: '#6c7086' },
  pluginBtn: { padding: '8px 16px', background: '#313244', color: '#cdd6f4',
    border: '1px solid #45475a', borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit' },

  main: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 },

  dropWrap: { width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 32 },
  drop: { border: '2px dashed', borderRadius: 16, padding: '64px 32px',
    textAlign: 'center', cursor: 'pointer', transition: 'all .2s' },
  dropIcon: { fontSize: 56, marginBottom: 16 },
  dropTitle: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
  dropSub: { fontSize: 14, color: '#6c7086', marginBottom: 20 },
  dropBtn: { display: 'inline-block', padding: '10px 24px',
    background: 'linear-gradient(135deg,#89b4fa,#cba6f7)', color: '#1e1e2e',
    borderRadius: 10, fontSize: 14, fontWeight: 700 },
  steps: { display: 'flex', gap: 12 },
  step: { flex: 1, background: '#181825', border: '1px solid #313244',
    borderRadius: 12, padding: '18px 14px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' },
  stepN: { width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg,#89b4fa,#cba6f7)', color: '#1e1e2e',
    fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 13, fontWeight: 600, color: '#cdd6f4' },
  stepS: { fontSize: 11, color: '#6c7086' },

  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  spinner: { width: 40, height: 40, border: '3px solid #313244',
    borderTopColor: '#89b4fa', borderRadius: '50%', animation: 'spin .8s linear infinite' },
  loadingTxt: { fontSize: 14, color: '#a6adc8' },

  resultWrap: { width: '100%', maxWidth: 1200, height: 'calc(100vh - 120px)',
    display: 'flex', gap: 20 },
  previewPane: { flex: 1, minWidth: 0, background: '#181825',
    border: '1px solid #313244', borderRadius: 14, display: 'flex',
    flexDirection: 'column', overflow: 'hidden' },
  paneHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: '1px solid #313244' },
  paneLabel: { fontSize: 12, color: '#a6adc8', fontFamily: 'monospace' },
  resetBtn: { background: 'transparent', border: '1px solid #45475a', borderRadius: 6,
    color: '#a6adc8', fontSize: 11, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' },
  iframeWrap: { flex: 1, background: '#fff', overflow: 'hidden' },
  iframe: { width: '100%', height: '100%', border: 'none' },

  actionPane: { width: 380, flexShrink: 0 },
  copyBox: { background: '#181825', border: '1px solid #313244',
    borderRadius: 14, padding: 28, height: '100%', display: 'flex',
    flexDirection: 'column', gap: 16 },
  successBadge: { alignSelf: 'flex-start', background: '#a6e3a11a', color: '#a6e3a1',
    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  copyTitle: { fontSize: 22, fontWeight: 800, color: '#cdd6f4' },
  copyDesc: { fontSize: 13, color: '#a6adc8', lineHeight: 1.6 },
  bigCopy: { padding: '20px', border: 'none', borderRadius: 14,
    fontSize: 18, fontWeight: 800, color: '#1e1e2e', cursor: 'pointer',
    fontFamily: 'inherit', letterSpacing: '-0.3px',
    transition: 'all .2s', boxShadow: '0 4px 20px rgba(137,180,250,.2)' },
  divider: { height: 1, background: '#313244', margin: '4px 0' },
  flowBox: { background: '#11111b', border: '1px solid #313244',
    borderRadius: 10, padding: '14px 18px' },
  flowTitle: { fontSize: 11, fontWeight: 700, color: '#6c7086',
    textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 },
  flowList: { fontSize: 13, color: '#a6adc8', paddingLeft: 18,
    lineHeight: 1.9, margin: 0 },
  pluginSmall: { marginTop: 'auto', background: 'transparent',
    border: '1px solid #313244', color: '#6c7086', padding: '10px',
    borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
};
