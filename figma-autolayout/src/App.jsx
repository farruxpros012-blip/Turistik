import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { domToSVG } from './utils/svgGenerator.js';
import './App.css';

export default function App() {
  const [status,   setStatus]   = useState('idle');
  const [fileName, setFileName] = useState('');
  const [error,    setError]    = useState('');
  const [html,     setHtml]     = useState('');
  const [blobUrls, setBlobUrls] = useState({});
  const iframeRef  = useRef(null);

  const processZip = async (file) => {
    setFileName(file.name);
    setStatus('loading');
    setError('');

    try {
      const zip   = await JSZip.loadAsync(file);
      const files = {};
      await Promise.all(
        Object.entries(zip.files)
          .filter(([, e]) => !e.dir)
          .map(([p, e]) => e.async('arraybuffer').then(b => { files[p] = b; }))
      );

      const htmlFiles = Object.keys(files).filter(p => /\.html?$/i.test(p));
      if (!htmlFiles.length) throw new Error('ZIP ichida HTML fayl topilmadi');

      const main = htmlFiles.find(p => /index\.html?$/i.test(p)) || htmlFiles[0];

      const MIME = {
        css:'text/css', js:'application/javascript',
        png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
        gif:'image/gif', webp:'image/webp', svg:'image/svg+xml',
        woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf',
      };
      const urls = {};
      for (const [p, buf] of Object.entries(files)) {
        const ext = p.split('.').pop().toLowerCase();
        urls[p] = URL.createObjectURL(new Blob([buf], { type: MIME[ext] || 'application/octet-stream' }));
      }

      let content = new TextDecoder().decode(files[main]);
      for (const [p, url] of Object.entries(urls)) {
        const b = p.split('/').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content
          .replace(new RegExp(`(src|href)=["']([^"']*/)?${b}["']`, 'g'), `$1="${url}"`)
          .replace(new RegExp(`url\\(["']?([^"'"]*\/)?${b}["']?\\)`, 'g'), `url("${url}")`);
      }

      Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
      setBlobUrls(urls);
      setHtml(content);
      setStatus('ready');
    } catch (e) {
      setError(e.message || 'Xato yuz berdi');
      setStatus('error');
    }
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Faqat .zip fayl qabul qilinadi');
      setStatus('error');
      return;
    }
    processZip(file);
  }, []);

  const handleCopy = async () => {
    setStatus('copying');
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) throw new Error('Iframe yuklanmadi');

      const svg     = domToSVG(iframeDoc);
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/svg+xml': svgBlob })]);
      } catch {
        await navigator.clipboard.writeText(svg);
      }

      setStatus('copied');
      setTimeout(() => setStatus('ready'), 2500);
    } catch (e) {
      setError('Nusxa olishda xato: ' + e.message);
      setStatus('error');
    }
  };

  const handleDownload = () => {
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (!iframeDoc) return;
      const svg  = domToSVG(iframeDoc);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = fileName.replace(/\.zip$/i, '') + '.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const reset = () => {
    Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
    setBlobUrls({}); setHtml(''); setFileName('');
    setStatus('idle'); setError('');
  };

  const isReady = status === 'ready' || status === 'copying' || status === 'copied';

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logo}>
          <FigmaIcon />
          <span style={S.logoTxt}>Figma <b style={{color:'#18a0fb'}}>Paste</b></span>
        </div>
        <span style={S.badge}>ZIP → SVG → Figma</span>
      </header>

      <main style={S.main}>
        {!isReady && status !== 'loading' && (
          <div style={S.col}>
            <div
              style={{...S.zone,
                borderColor: status === 'error' ? '#ff6b6b' : '#3a3a3a',
                background:  status === 'error' ? '#ff6b6b0a' : 'transparent',
              }}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => e.preventDefault()}
            >
              <UpArrow />
              {status === 'error'
                ? <p style={{color:'#ff6b6b', fontSize:14, margin:'8px 0 14px'}}>{error}</p>
                : <><p style={S.zoneTitle}>ZIP faylni tashlang</p>
                    <p style={S.zoneSub}>yoki quyidagi tugmani bosing</p></>
              }
              <label style={S.pickBtn}>
                <input type="file" accept=".zip" style={{display:'none'}}
                  onChange={e => handleFile(e.target.files[0])} />
                ZIP tanlash
              </label>
            </div>

            <div style={S.steps}>
              {[
                ['1', 'ZIP yuklang',     'HTML/CSS loyiha'],
                ['2', 'Copy bosing',     "SVG clipboard'ga"],
                ['3', 'Figmada Ctrl+V', 'Editable vectorlar!'],
              ].map(([n, t, s]) => (
                <div key={n} style={S.step}>
                  <span style={S.stepN}>{n}</span>
                  <strong style={S.stepT}>{t}</strong>
                  <span style={S.stepS}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div style={S.ctr}><div style={S.spin}/><p style={S.loadTxt}>{fileName}…</p></div>
        )}

        {isReady && (
          <div style={S.split}>
            <div style={S.previewBox}>
              <div style={S.pHead}>
                <span style={S.pTitle}>Ko'rinish</span>
                <button onClick={reset} style={S.closeBtn}>✕ Boshqa fayl</button>
              </div>
              <div style={S.iWrap}>
                <iframe ref={iframeRef} srcDoc={html}
                  sandbox="allow-scripts allow-same-origin"
                  style={S.iframe} title="preview" />
              </div>
              <p style={S.fname}>{fileName}</p>
            </div>

            <div style={S.actionBox}>
              <button
                onClick={handleCopy}
                disabled={status === 'copying'}
                style={{...S.bigBtn,
                  background: status === 'copied' ? '#1bc47d' : '#18a0fb',
                  opacity: status === 'copying' ? 0.7 : 1,
                }}
              >
                {status === 'copied' ? <><Check/> Nusxa olindi!</>
                 : status === 'copying' ? <><SpinIcon/> Tayyorlanmoqda…</>
                 : <><CopyIcon/> Copy</>}
              </button>

              <p style={S.pasteNote}>
                Keyin Figmada <kbd style={S.kbd}>Ctrl+V</kbd> bosing
              </p>

              <div style={S.divider}/>

              <button onClick={handleDownload} style={S.dlBtn}>
                <DlIcon /> SVG yuklab olish
              </button>
              <p style={S.dlNote}>
                Yoki SVG faylni Figma canvasiga surüklang → editable shapes
              </p>

              <div style={S.infoBox}>
                <p style={S.infoTitle}>Figmaga paste qilganda:</p>
                <ul style={S.infoList}>
                  <li>Har bir blok → <b>Rectangle</b> (rangli, radius)</li>
                  <li>Matnlar → <b>Text</b> qatlam</li>
                  <li>Barchasi alohida <b>editable</b></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FigmaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2"  y="2"  width="9" height="9" rx="2" fill="#18a0fb"/>
      <rect x="13" y="2"  width="9" height="9" rx="2" fill="#a259ff"/>
      <rect x="2"  y="13" width="9" height="9" rx="2" fill="#1bc47d"/>
      <rect x="13" y="13" width="9" height="4" rx="1" fill="#f24e1e"/>
      <rect x="13" y="19" width="9" height="3" rx="1" fill="#ff7262"/>
    </svg>
  );
}
function UpArrow() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{marginBottom:6}}>
      <rect x="6" y="6" width="36" height="36" rx="8" fill="#242424" stroke="#333" strokeWidth="1.5"/>
      <path d="M24 16v16M17 23l7-7 7 7" stroke="#18a0fb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="14" y="34" width="20" height="3" rx="1.5" fill="#333"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{marginRight:8}}>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{marginRight:8}}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SpinIcon() {
  return <span style={{display:'inline-block',width:18,height:18,border:'2px solid #ffffff44',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite',marginRight:8}}/>;
}
function DlIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{marginRight:6}}>
      <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

const S = {
  root:      { minHeight:'100vh', background:'#181818', color:'#e5e5e5', fontFamily:"'Inter',-apple-system,sans-serif", display:'flex', flexDirection:'column' },
  header:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 20px', background:'#202020', borderBottom:'1px solid #2a2a2a' },
  logo:      { display:'flex', alignItems:'center', gap:9 },
  logoTxt:   { fontSize:15, fontWeight:400, letterSpacing:'-0.3px' },
  badge:     { fontSize:11, color:'#555', background:'#2a2a2a', padding:'3px 9px', borderRadius:5 },
  main:      { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  col:       { display:'flex', flexDirection:'column', alignItems:'center', gap:28, width:'100%', maxWidth:520 },
  zone:      { width:'100%', border:'2px dashed', borderRadius:16, padding:'48px 28px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  zoneTitle: { fontSize:16, fontWeight:500, margin:0 },
  zoneSub:   { fontSize:13, color:'#555', margin:'2px 0 10px' },
  pickBtn:   { padding:'10px 28px', background:'#18a0fb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit' },
  steps:     { display:'flex', gap:12, width:'100%' },
  step:      { flex:1, background:'#202020', border:'1px solid #2a2a2a', borderRadius:10, padding:'14px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, textAlign:'center' },
  stepN:     { width:26, height:26, borderRadius:'50%', background:'#18a0fb18', color:'#18a0fb', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:2 },
  stepT:     { fontSize:12, color:'#ccc' },
  stepS:     { fontSize:11, color:'#555' },
  ctr:       { display:'flex', flexDirection:'column', alignItems:'center', gap:12 },
  spin:      { width:32, height:32, border:'3px solid #2a2a2a', borderTop:'3px solid #18a0fb', borderRadius:'50%', animation:'spin .8s linear infinite' },
  loadTxt:   { fontSize:13, color:'#555', margin:0 },
  split:     { display:'flex', gap:16, width:'100%', maxWidth:1100, height:'calc(100vh - 70px)' },
  previewBox:{ flex:1, minWidth:0, background:'#202020', borderRadius:12, border:'1px solid #2a2a2a', display:'flex', flexDirection:'column', overflow:'hidden' },
  pHead:     { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', borderBottom:'1px solid #2a2a2a', flexShrink:0 },
  pTitle:    { fontSize:11, fontWeight:600, color:'#555', textTransform:'uppercase', letterSpacing:'0.07em' },
  closeBtn:  { background:'none', border:'1px solid #2e2e2e', borderRadius:6, color:'#555', fontSize:11, padding:'3px 9px', cursor:'pointer', fontFamily:'inherit' },
  iWrap:     { flex:1, background:'#fff', overflow:'hidden', minHeight:0 },
  iframe:    { width:'100%', height:'100%', border:'none', display:'block' },
  fname:     { fontSize:11, color:'#3a3a3a', fontFamily:'monospace', padding:'5px 14px', flexShrink:0 },
  actionBox: { width:320, flexShrink:0, display:'flex', flexDirection:'column', gap:0 },
  bigBtn:    { width:'100%', padding:'18px', border:'none', borderRadius:12, fontSize:18, fontWeight:800, color:'#fff', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s, opacity 0.2s', letterSpacing:'-0.5px' },
  pasteNote: { textAlign:'center', fontSize:13, color:'#555', margin:'10px 0 0' },
  kbd:       { background:'#2a2a2a', border:'1px solid #3a3a3a', borderRadius:4, padding:'2px 6px', fontSize:12, color:'#aaa', fontFamily:'monospace' },
  divider:   { margin:'18px 0', borderTop:'1px solid #2a2a2a' },
  dlBtn:     { width:'100%', padding:'12px', background:'transparent', border:'1px solid #2e2e2e', borderRadius:10, fontSize:14, fontWeight:500, color:'#888', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center' },
  dlNote:    { textAlign:'center', fontSize:11, color:'#444', margin:'8px 0 0', lineHeight:1.5 },
  infoBox:   { marginTop:18, background:'#202020', border:'1px solid #2a2a2a', borderRadius:10, padding:'14px 16px' },
  infoTitle: { fontSize:12, fontWeight:600, color:'#666', marginBottom:8 },
  infoList:  { fontSize:12, color:'#555', paddingLeft:16, lineHeight:1.9, margin:0 },
};
