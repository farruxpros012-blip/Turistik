import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import './App.css';

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  PREVIEW: 'preview',
  COPYING: 'copying',
  COPIED: 'copied',
  ERROR: 'error',
};

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [blobUrls, setBlobUrls] = useState({});
  const iframeRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef(false);

  const processZip = async (file) => {
    setFileName(file.name);
    setStatus(STATUS.LOADING);
    setErrorMsg('');

    try {
      const zip = await JSZip.loadAsync(file);
      const files = {};

      // Read all files from ZIP
      const promises = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          promises.push(
            zipEntry.async('arraybuffer').then(buf => {
              files[relativePath] = buf;
            })
          );
        }
      });
      await Promise.all(promises);

      // Find the main HTML file
      const htmlFiles = Object.keys(files).filter(
        p => p.endsWith('.html') || p.endsWith('.htm')
      );

      if (htmlFiles.length === 0) {
        // If no HTML, check for images
        const imageFiles = Object.keys(files).filter(p =>
          /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(p)
        );
        if (imageFiles.length > 0) {
          await handleImageZip(files, imageFiles);
          return;
        }
        throw new Error('ZIP ichida HTML yoki rasm fayl topilmadi');
      }

      // Prefer index.html or first HTML file
      const mainHtml =
        htmlFiles.find(p => p.toLowerCase().endsWith('index.html')) ||
        htmlFiles[0];

      // Create blob URLs for all assets
      const urls = {};
      const mimeTypes = {
        css: 'text/css',
        js: 'application/javascript',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        woff: 'font/woff',
        woff2: 'font/woff2',
        ttf: 'font/ttf',
      };

      for (const [path, buf] of Object.entries(files)) {
        const ext = path.split('.').pop().toLowerCase();
        const mime = mimeTypes[ext] || 'application/octet-stream';
        const blob = new Blob([buf], { type: mime });
        urls[path] = URL.createObjectURL(blob);
      }

      // Get HTML content and patch asset URLs
      const htmlBuf = files[mainHtml];
      const htmlText = new TextDecoder().decode(htmlBuf);

      // Replace relative paths with blob URLs
      let patchedHtml = htmlText;
      for (const [path, url] of Object.entries(urls)) {
        const basename = path.split('/').pop();
        // Replace references to files in HTML
        patchedHtml = patchedHtml
          .replace(new RegExp(`(src|href)=["']([^"']*\\/)?${escapeRegex(basename)}["']`, 'g'), `$1="${url}"`)
          .replace(new RegExp(`url\\(["']?([^"')]*\\/)?${escapeRegex(basename)}["']?\\)`, 'g'), `url("${url}")`);
      }

      // Revoke old URLs
      Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
      setBlobUrls(urls);
      setHtmlContent(patchedHtml);
      setStatus(STATUS.PREVIEW);

    } catch (err) {
      setErrorMsg(err.message || 'Xato yuz berdi');
      setStatus(STATUS.ERROR);
    }
  };

  const handleImageZip = async (files, imageFiles) => {
    // Show first image as preview, copy it
    const firstImage = imageFiles[0];
    const buf = files[firstImage];
    const ext = firstImage.split('.').pop().toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const blob = new Blob([buf], { type: mime });
    const url = URL.createObjectURL(blob);

    Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
    setBlobUrls({ [firstImage]: url });
    setHtmlContent(`<img src="${url}" style="max-width:100%;display:block;" />`);
    setStatus(STATUS.PREVIEW);
  };

  const handleCopy = async () => {
    setStatus(STATUS.COPYING);
    try {
      const target = iframeRef.current?.contentDocument?.body || previewRef.current;

      let canvas;
      if (iframeRef.current) {
        // Capture iframe content
        const iframeDoc = iframeRef.current.contentDocument;
        canvas = await html2canvas(iframeDoc.body, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
      } else {
        canvas = await html2canvas(previewRef.current, {
          useCORS: true,
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
        });
      }

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);

      setStatus(STATUS.COPIED);
      setTimeout(() => setStatus(STATUS.PREVIEW), 3000);
    } catch (err) {
      setErrorMsg('Nusxa olishda xato: ' + (err.message || 'Ruxsat kerak'));
      setStatus(STATUS.ERROR);
    }
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      setErrorMsg('Faqat .zip fayl qabul qilinadi');
      setStatus(STATUS.ERROR);
      return;
    }
    processZip(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    dragRef.current = false;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); dragRef.current = true; };
  const onDragLeave = () => { dragRef.current = false; };

  const reset = () => {
    Object.values(blobUrls).forEach(u => URL.revokeObjectURL(u));
    setBlobUrls({});
    setHtmlContent('');
    setFileName('');
    setStatus(STATUS.IDLE);
    setErrorMsg('');
  };

  const isPreview = status === STATUS.PREVIEW || status === STATUS.COPYING || status === STATUS.COPIED;

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="#18a0fb"/>
            <rect x="13" y="2" width="9" height="9" rx="2" fill="#a259ff"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="#1bc47d"/>
            <rect x="13" y="13" width="9" height="4" rx="1" fill="#f24e1e"/>
            <rect x="13" y="19" width="9" height="3" rx="1" fill="#ff7262"/>
          </svg>
          <span style={styles.logoText}>Figma Paste</span>
        </div>
        <span style={styles.headerSub}>ZIP → Figma</span>
      </div>

      {/* Main */}
      <div style={styles.main}>

        {/* IDLE / ERROR: Upload zone */}
        {!isPreview && status !== STATUS.LOADING && (
          <div style={styles.uploadCard}>
            <div
              style={{
                ...styles.dropZone,
                borderColor: status === STATUS.ERROR ? '#ff6b6b' : '#3d3d3d',
                background: status === STATUS.ERROR ? 'rgba(255,107,107,0.05)' : '#1e1e1e',
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              {/* Icon */}
              <div style={styles.uploadIcon}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="8" width="32" height="32" rx="6" fill="#2c2c2c" stroke="#3d3d3d" strokeWidth="1.5"/>
                  <path d="M24 18v14M18 24l6-6 6 6" stroke="#18a0fb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="14" y="32" width="20" height="3" rx="1.5" fill="#3d3d3d"/>
                </svg>
              </div>

              {status === STATUS.ERROR ? (
                <p style={{ ...styles.uploadHint, color: '#ff6b6b', marginBottom: 16 }}>
                  {errorMsg}
                </p>
              ) : (
                <>
                  <p style={styles.uploadTitle}>ZIP faylni bu yerga tashlang</p>
                  <p style={styles.uploadHint}>yoki pastdagi tugmani bosing</p>
                </>
              )}

              <label style={styles.uploadBtn}>
                <input
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                ZIP tanlash
              </label>
            </div>

            <p style={styles.supportNote}>
              HTML, CSS, rasm fayllari qo'llab-quvvatlanadi
            </p>
          </div>
        )}

        {/* LOADING */}
        {status === STATUS.LOADING && (
          <div style={styles.centered}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>ZIP ochilmoqda...</p>
            <p style={{ ...styles.loadingText, fontSize: 12, opacity: 0.5 }}>{fileName}</p>
          </div>
        )}

        {/* PREVIEW */}
        {isPreview && (
          <div style={styles.previewLayout}>
            {/* Top bar */}
            <div style={styles.previewBar}>
              <div style={styles.fileTag}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="#8c8c8c" strokeWidth="2" fill="none"/>
                  <path d="M13 2v7h7" stroke="#8c8c8c" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={styles.fileTagText}>{fileName}</span>
              </div>
              <button onClick={reset} style={styles.resetBtn} title="Yangidan boshlash">
                ✕ Boshqa fayl
              </button>
            </div>

            {/* Preview iframe */}
            <div style={styles.previewFrame}>
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                sandbox="allow-scripts allow-same-origin"
                style={styles.iframe}
                title="preview"
              />
            </div>

            {/* Copy section */}
            <div style={styles.copySection}>
              {status === STATUS.COPIED ? (
                <div style={styles.copiedBox}>
                  <span style={styles.copiedIcon}>✓</span>
                  <div>
                    <p style={styles.copiedTitle}>Nusxa olindi!</p>
                    <p style={styles.copiedHint}>Figmada Ctrl+V (yoki ⌘V) bosing</p>
                  </div>
                </div>
              ) : (
                <button
                  style={{
                    ...styles.copyBtn,
                    opacity: status === STATUS.COPYING ? 0.7 : 1,
                  }}
                  onClick={handleCopy}
                  disabled={status === STATUS.COPYING}
                >
                  {status === STATUS.COPYING ? (
                    <><span style={styles.btnSpinner} /> Nusxa olinmoqda...</>
                  ) : (
                    <><CopyIcon /> Copy</>
                  )}
                </button>
              )}

              <p style={styles.copyHint}>
                Bosing → Figmada Ctrl+V bilan paste qiling
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8, flexShrink: 0 }}>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  root: {
    minHeight: '100vh',
    background: '#1e1e1e',
    color: '#e5e5e5',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: '1px solid #2c2c2c',
    background: '#252525',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e5e5e5',
    letterSpacing: '-0.3px',
  },
  headerSub: {
    fontSize: 11,
    color: '#666',
    background: '#2c2c2c',
    padding: '3px 8px',
    borderRadius: 4,
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  uploadCard: {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  dropZone: {
    width: '100%',
    border: '2px dashed',
    borderRadius: 16,
    padding: '48px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    cursor: 'default',
    transition: 'all 0.2s ease',
  },
  uploadIcon: {
    marginBottom: 8,
    opacity: 0.8,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: '#e5e5e5',
    margin: 0,
  },
  uploadHint: {
    fontSize: 13,
    color: '#666',
    margin: 0,
  },
  uploadBtn: {
    marginTop: 8,
    padding: '10px 24px',
    background: '#18a0fb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  supportNote: {
    fontSize: 11,
    color: '#555',
    margin: 0,
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #2c2c2c',
    borderTop: '3px solid #18a0fb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 14,
    color: '#8c8c8c',
    margin: 0,
  },
  previewLayout: {
    width: '100%',
    maxWidth: 900,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: '#252525',
    borderRadius: 12,
    border: '1px solid #333',
    overflow: 'hidden',
  },
  previewBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid #333',
    background: '#2c2c2c',
  },
  fileTag: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  fileTagText: {
    fontSize: 12,
    color: '#8c8c8c',
    fontFamily: 'monospace',
  },
  resetBtn: {
    background: 'none',
    border: '1px solid #3d3d3d',
    borderRadius: 6,
    color: '#666',
    fontSize: 11,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },
  previewFrame: {
    background: '#fff',
    minHeight: 320,
    maxHeight: 500,
    overflow: 'hidden',
    position: 'relative',
  },
  iframe: {
    width: '100%',
    height: 420,
    border: 'none',
    display: 'block',
  },
  copySection: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid #333',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 40px',
    background: '#18a0fb',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.2px',
    transition: 'all 0.15s',
    minWidth: 180,
  },
  btnSpinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginRight: 8,
  },
  copyHint: {
    fontSize: 12,
    color: '#555',
    margin: 0,
    textAlign: 'center',
  },
  copiedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(27,196,125,0.1)',
    border: '1px solid rgba(27,196,125,0.3)',
    borderRadius: 10,
    padding: '12px 24px',
  },
  copiedIcon: {
    fontSize: 24,
    color: '#1bc47d',
  },
  copiedTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1bc47d',
    margin: '0 0 2px',
  },
  copiedHint: {
    fontSize: 12,
    color: '#8c8c8c',
    margin: 0,
  },
};
