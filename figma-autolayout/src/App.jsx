import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { parseHTMLToFigmaTree, generatePluginCode } from './utils/cssParser.js';
import './App.css';

const STATUS = { IDLE:'idle', LOADING:'loading', READY:'ready', COPIED:'copied', ERROR:'error' };

export default function App() {
  const [status,   setStatus]   = useState(STATUS.IDLE);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [htmlContent, setHtml] = useState('');
  const [pluginCode,  setCode] = useState('');
  const [blobUrls, setBlobUrls] = useState({});
  const iframeRef = useRef(null);

  const processZip = async (file) => {
    setFileName(file.name);
    setStatus(STATUS.LOADING);
    setErrorMsg('');
    try {
      const zip   = await JSZip.loadAsync(file);
      const files = {};
      await Promise.all(
        Object.entries(zip.files)
          .filter(([, e]) => !e.dir)
          .map(([path, entry]) => entry.async('arraybuffer').then(buf => { files[path] = buf; }))
      );

      const htmlFiles = Object.keys(files).filter(p => /\.html?$/i.test(p));
      if (!htmlFiles.length) throw new Error('ZIP ichida HTML fayl topilmadi');

      const mainHtml = htmlFiles.find(p => /index\.html?$/i.test(p)) || htmlFiles[0];

      const MIME = { css:'text/css', js:'application/javascript', png:'image/png',
        jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp',
        svg:'image/svg+xml', woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf' };
      const urls = {};
      for (const [path, buf] of Object.entries(files)) {
        const ext  = path.split('.').pop().toLowerCase();
        urls[path] = URL.createObjectURL(new Blob([buf], { type: MIME[ext] || 'application/octet-stream' }));
      }

      let html = new TextDecoder().decode(files[mainHtml]);
      for (const [path, url] of Object.entries(urls)) {
        const base = path.split('/').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html
          .replace(new RegExp(`(src|href)=["']([^"']*/)?${base}["']`, 'g'), `$1="${url}"`)
          .replace(new RegExp(`url\\(["']?([^"'"]*\/)?${base}["']?\\)`, 'g'), `url("${url}")`);
      }

      Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
      setBlobUrls(urls);
      setHtml(html);
      setCode(generatePluginCode(parseHTMLToFigmaTree(html)));
      setStatus(STATUS.READY);
    } catch (err) {
      setErrorMsg(err.message || 'Noma\'lum xato');
      setStatus(STATUS.ERROR);
    }
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMsg('Faqat .zip fayl qabul qilinadi');
      setStatus(STATUS.ERROR);
      return;
    }
    processZip(file);
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  const handleCopy = async () => {
    if (!pluginCode) return;
    await navigator.clipboard.writeText(pluginCode);
    setStatus(STATUS.COPIED);
    setTimeout(() => setStatus(STATUS.READY), 2500);
  };

  const reset = () => {
    Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
    setBlobUrls({}); setHtml(''); setCode(''); setFileName('');
    setStatus(STATUS.IDLE); setErrorMsg('');
  };

  const isReady = status === STATUS.READY || status === STATUS.COPIED;

  return (
    <div style={S.root}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.logoRow}>
          <FigmaLogo />
          <span style={S.logoText}>Figma <span style={{color:'#18a0fb'}}>AutoLayout</span></span>
        </div>
        <span style={S.badge}>ZIP → Editable Figma Layers</span>
      </header>

      <main style={S.main}>
        {/* Upload */}
        {!isReady && status !== STATUS.LOADING && (
          <div style={S.centerCol}>
            <div
              style={{...S.dropZone,
                borderColor: status === STATUS.ERROR ? '#ff6b6b' : '#3d3d3d',
                background:  status === STATUS.ERROR ? 'rgba(255,107,107,0.04)' : 'transparent',
              }}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
            >
              <UploadIcon />
              {status === STATUS.ERROR
                ? <p style={{color:'#ff6b6b',fontSize:14,margin:'8px 0 16px'}}>{errorMsg}</p>
                : (<><p style={S.dropTitle}>ZIP faylni bu yerga tashlang</p>
                     <p style={S.dropSub}>yoki quyi tugmani bosing</p></>
                  )}
              <label style={S.uploadBtn}>
                <input type="file" accept=".zip" style={{display:'none'}}
                  onChange={e => handleFile(e.target.files[0])} />
                ZIP tanlash
              </label>
            </div>

            <div style={S.stepsRow}>
              {[
                {n:'1', t:'ZIP yuklang',       s:'HTML/CSS loyihangiz'},
                {n:'2', t:'Kodni nusxalang',   s:'Figma plugin kodi'},
                {n:'3', t:'Figmada ishlatang', s:'Run script → paste → Run'},
              ].map(({n,t,s}) => (
                <div key={n} style={S.step}>
                  <div style={S.stepNum}>{n}</div>
                  <div style={S.stepTitle}>{t}</div>
                  <div style={S.stepSub}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {status === STATUS.LOADING && (
          <div style={S.centered}>
            <div style={S.spinner} />
            <p style={S.loadingText}>{fileName} ochilmoqda…</p>
          </div>
        )}

        {/* Ready */}
        {isReady && (
          <div style={S.twoCol}>
            {/* Preview */}
            <div style={S.previewPanel}>
              <div style={S.panelHeader}>
                <span style={S.panelTitle}>Ko'rinish</span>
                <button onClick={reset} style={S.resetBtn}>✕ Boshqa fayl</button>
              </div>
              <div style={S.iframeWrap}>
                <iframe ref={iframeRef} srcDoc={htmlContent}
                  sandbox="allow-scripts allow-same-origin"
                  style={S.iframe} title="preview" />
              </div>
              <div style={S.fileTag}>{fileName}</div>
            </div>

            {/* Plugin code */}
            <div style={S.codePanel}>
              <div style={S.panelHeader}>
                <span style={S.panelTitle}>Figma Plugin Kodi</span>
                <span style={S.linesCount}>{pluginCode.split('\n').length} qator</span>
              </div>

              <button onClick={handleCopy} style={{...S.copyBtn,
                background: status === STATUS.COPIED ? '#1bc47d' : '#18a0fb'}}>
                {status === STATUS.COPIED
                  ? <><CheckIcon /> Nusxa olindi!</>
                  : <><CopyIcon />  Kodni nusxalash</> }
              </button>

              <div style={S.instructions}>
                <p style={S.instrTitle}>Figmaga qanday joylash:</p>
                <ol style={S.instrList}>
                  <li>Figmani oching</li>
                  <li><b>Plugins → Development → "Run script"</b></li>
                  <li>Nusxalangan kodni joylashtiring</li>
                  <li><b>Run</b> tugmasini bosing</li>
                  <li>Canvas'da editable auto-layout tayyor ✓</li>
                </ol>
              </div>

              <div style={S.codeBox}>
                <pre style={S.codePre}>{pluginCode}</pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FigmaLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2"  y="2"  width="9" height="9" rx="2" fill="#18a0fb"/>
      <rect x="13" y="2"  width="9" height="9" rx="2" fill="#a259ff"/>
      <rect x="2"  y="13" width="9" height="9" rx="2" fill="#1bc47d"/>
      <rect x="13" y="13" width="9" height="4" rx="1" fill="#f24e1e"/>
      <rect x="13" y="19" width="9" height="3" rx="1" fill="#ff7262"/>
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{marginBottom:8}}>
      <rect x="6" y="6" width="40" height="40" rx="8" fill="#2c2c2c" stroke="#3d3d3d" strokeWidth="1.5"/>
      <path d="M26 18v16M19 25l7-7 7 7" stroke="#18a0fb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="16" y="36" width="20" height="3" rx="1.5" fill="#3d3d3d"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight:7}}>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight:7}}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const S = {
  root:         { minHeight:'100vh', background:'#1a1a1a', color:'#e5e5e5', fontFamily:"'Inter', -apple-system, sans-serif", display:'flex', flexDirection:'column' },
  header:       { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 20px', background:'#242424', borderBottom:'1px solid #2e2e2e' },
  logoRow:      { display:'flex', alignItems:'center', gap:9 },
  logoText:     { fontSize:15, fontWeight:600, letterSpacing:'-0.3px' },
  badge:        { fontSize:11, color:'#666', background:'#2c2c2c', padding:'3px 9px', borderRadius:5 },
  main:         { flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 },
  centerCol:    { display:'flex', flexDirection:'column', alignItems:'center', gap:32, width:'100%', maxWidth:540 },
  dropZone:     { width:'100%', border:'2px dashed #3d3d3d', borderRadius:18, padding:'52px 32px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  dropTitle:    { fontSize:16, fontWeight:500, color:'#e5e5e5', margin:0 },
  dropSub:      { fontSize:13, color:'#5a5a5a', margin:'2px 0 10px' },
  uploadBtn:    { padding:'10px 26px', background:'#18a0fb', color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:500, cursor:'pointer', fontFamily:'inherit' },
  stepsRow:     { display:'flex', gap:16, width:'100%' },
  step:         { flex:1, background:'#242424', border:'1px solid #2e2e2e', borderRadius:10, padding:'16px 14px', textAlign:'center' },
  stepNum:      { width:28, height:28, borderRadius:'50%', background:'#18a0fb22', color:'#18a0fb', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' },
  stepTitle:    { fontSize:13, fontWeight:600, color:'#ddd', marginBottom:4 },
  stepSub:      { fontSize:11, color:'#555' },
  centered:     { display:'flex', flexDirection:'column', alignItems:'center', gap:14 },
  spinner:      { width:34, height:34, border:'3px solid #2c2c2c', borderTop:'3px solid #18a0fb', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  loadingText:  { fontSize:13, color:'#666', margin:0 },
  twoCol:       { display:'flex', gap:16, width:'100%', maxWidth:1200, height:'calc(100vh - 80px)' },
  previewPanel: { flex:1, minWidth:0, background:'#242424', borderRadius:12, border:'1px solid #2e2e2e', display:'flex', flexDirection:'column', overflow:'hidden' },
  panelHeader:  { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #2e2e2e', flexShrink:0 },
  panelTitle:   { fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em' },
  resetBtn:     { background:'none', border:'1px solid #333', borderRadius:6, color:'#555', fontSize:11, padding:'3px 9px', cursor:'pointer', fontFamily:'inherit' },
  iframeWrap:   { flex:1, background:'#fff', minHeight:0, overflow:'hidden' },
  iframe:       { width:'100%', height:'100%', border:'none', display:'block' },
  fileTag:      { fontSize:11, color:'#444', fontFamily:'monospace', padding:'6px 14px', flexShrink:0 },
  codePanel:    { width:400, flexShrink:0, background:'#242424', borderRadius:12, border:'1px solid #2e2e2e', display:'flex', flexDirection:'column', overflow:'hidden' },
  linesCount:   { fontSize:11, color:'#444', fontFamily:'monospace' },
  copyBtn:      { margin:'14px 14px 0', padding:13, border:'none', borderRadius:9, fontSize:15, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s', flexShrink:0 },
  instructions: { margin:'14px 14px 0', background:'#1e1e1e', border:'1px solid #2e2e2e', borderRadius:8, padding:'12px 14px', flexShrink:0 },
  instrTitle:   { fontSize:12, fontWeight:600, color:'#888', marginBottom:8 },
  instrList:    { fontSize:12, color:'#666', paddingLeft:18, lineHeight:1.9, margin:0 },
  codeBox:      { flex:1, overflow:'auto', margin:'12px 14px 14px', background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:8 },
  codePre:      { fontSize:10, fontFamily:'Consolas, monospace', color:'#555', padding:12, margin:0, whiteSpace:'pre-wrap', lineHeight:1.5 },
};
