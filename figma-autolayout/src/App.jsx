import { useState } from 'react';
import JSZip from 'jszip';
import './App.css';

export default function App() {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const downloadPlugin = async () => {
    setDownloading(true);
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
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'html-figma-autolayout-plugin.zip';
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      alert('Yuklab olishda xato: ' + e.message);
    }
    setDownloading(false);
  };

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.logoRow}>
          <div style={S.logoIcon}>⚡</div>
          <div>
            <div style={S.logoTitle}>HTML → Figma AutoLayout</div>
            <div style={S.logoSub}>Figma Plugin</div>
          </div>
        </div>
        <a
          href="https://www.figma.com/community/plugins"
          style={S.headerLink}
          target="_blank"
          rel="noreferrer"
        >
          Figma Plugins
        </a>
      </header>

      <main style={S.main}>
        <div style={S.hero}>
          <div style={S.heroTag}>Figma Plugin</div>
          <h1 style={S.heroTitle}>
            HTML/CSS kodini<br />
            <span style={S.heroAccent}>Figma Auto-Layout</span>ga aylantiring
          </h1>
          <p style={S.heroDesc}>
            ZIP faylingizni yuklang — plugin har bir{' '}
            <code style={S.code}>div</code>, padding, gap va rangni haqiqiy
            Figma frame&apos;lariga aylantiradi. <strong>html.to.design</strong> kabi.
          </p>

          <div style={S.btnRow}>
            <button
              style={{
                ...S.dlBtn,
                background: done
                  ? 'linear-gradient(135deg,#a6e3a1,#94e2d5)'
                  : 'linear-gradient(135deg,#89b4fa,#cba6f7)',
                opacity: downloading ? 0.7 : 1,
                cursor: downloading ? 'not-allowed' : 'pointer',
              }}
              onClick={downloadPlugin}
              disabled={downloading}
            >
              {done ? '✅ Yuklab olindi!' : downloading ? '⏳ Tayyorlanmoqda…' : '⬇️  Plugin yuklab olish'}
            </button>
            <div style={S.dlNote}>Bepul · ZIP · 3 ta fayl</div>
          </div>
        </div>

        <div style={S.features}>
          {FEATURES.map(f => (
            <div key={f.title} style={S.card}>
              <div style={S.cardIcon}>{f.icon}</div>
              <div style={S.cardTitle}>{f.title}</div>
              <div style={S.cardDesc}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={S.steps}>
          <h2 style={S.stepsTitle}>Qanday o&apos;rnatiladi?</h2>
          <div style={S.stepsList}>
            {STEPS.map((s, i) => (
              <div key={i} style={S.stepItem}>
                <div style={S.stepNum}>{i + 1}</div>
                <div>
                  <div style={S.stepLabel}>{s.label}</div>
                  <div style={S.stepSub}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.demo}>
          <h2 style={S.stepsTitle}>Misol HTML</h2>
          <pre style={S.codeBlock}>{EXAMPLE_HTML}</pre>
          <p style={S.demoNote}>
            Yuqoridagi HTML → Figma&apos;da 3 ta avto-layout frame bo&apos;ladi: wrapper → card → button
          </p>
        </div>
      </main>

      <footer style={S.footer}>
        <span>HTML → Figma AutoLayout Plugin · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🏗️',
    title: 'Haqiqiy Auto-Layout',
    desc: 'display:flex → Figma layoutMode HORIZONTAL/VERTICAL. gap → itemSpacing. padding → paddingTop/Right/Bottom/Left.',
  },
  {
    icon: '📦',
    title: 'ZIP yuklash',
    desc: 'HTML + CSS fayllarni ZIP qilib yuklang. Plugin CSS ni ham o\'qib, ranglar va shriftlarni to\'g\'ri o\'rnatadi.',
  },
  {
    icon: '🎨',
    title: 'Ranglar & Radius',
    desc: 'background-color, border-radius, opacity — barchasi Figma fills va cornerRadius sifatida uzatiladi.',
  },
  {
    icon: '✍️',
    title: 'Matn qatlamlari',
    desc: 'Har bir text node → figma.createText(). fontSize, fontWeight, color to\'liq saqlanadi.',
  },
  {
    icon: '↔️',
    title: 'FILL / FIXED / HUG',
    desc: 'width:100% → FILL, aniq px → FIXED, boshqalar → HUG. Figma sizing modeli to\'liq qo\'llaniladi.',
  },
  {
    icon: '⚡',
    title: 'Offline ishlaydi',
    desc: 'Plugin ichida barcha parsing ishlaydi. Internet kerak emas, maxfiy kod tashqariga chiqmaydi.',
  },
];

const STEPS = [
  { label: 'Plugin ZIP yuklab oling', sub: 'Yuqoridagi tugmani bosing' },
  { label: 'Figmani oching', sub: 'Menu → Plugins → Development → Import plugin from manifest…' },
  { label: 'manifest.json tanlang', sub: "Ochilgan ZIP papkasidagi manifest.json faylini ko'rsating" },
  { label: 'Pluginni ishga tushiring', sub: 'Plugins → Development → HTML → Figma AutoLayout' },
  { label: 'ZIP yoki HTML kiriting', sub: 'Yuklang va "Figmada yaratish" tugmasini bosing' },
];

const EXAMPLE_HTML = `<div style="display:flex;flex-direction:column;gap:16px;
            padding:24px;background:#ffffff;border-radius:12px;width:360px">

  <h2 style="font-size:20px;font-weight:700;color:#1a1a2e">
    Xush kelibsiz!
  </h2>

  <p style="font-size:14px;color:#6c7086;line-height:1.6">
    Bu matn Figmada Text qatlami bo'ladi.
  </p>

  <div style="display:flex;flex-direction:row;gap:8px">
    <button style="flex:1;padding:10px;background:#89b4fa;
                   border-radius:8px;font-size:14px;color:#1e1e2e">
      Asosiy
    </button>
    <button style="padding:10px 16px;background:#313244;
                   border-radius:8px;font-size:14px;color:#cdd6f4">
      Bekor
    </button>
  </div>
</div>`;

const S = {
  root: {
    minHeight: '100vh',
    background: '#1e1e2e',
    color: '#cdd6f4',
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px',
    background: '#181825',
    borderBottom: '1px solid #313244',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logoRow:   { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon:  { width: 32, height: 32, background: 'linear-gradient(135deg,#89b4fa,#cba6f7)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  logoTitle: { fontSize: 14, fontWeight: 700, color: '#cdd6f4' },
  logoSub:   { fontSize: 11, color: '#6c7086' },
  headerLink:{ fontSize: 12, color: '#89b4fa', textDecoration: 'none' },
  main: {
    flex: 1,
    maxWidth: 900,
    margin: '0 auto',
    padding: '64px 24px 80px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 72,
  },
  hero:      { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 },
  heroTag:   { background: '#313244', color: '#89b4fa', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: '.08em', textTransform: 'uppercase' },
  heroTitle: { fontSize: 48, fontWeight: 800, lineHeight: 1.15, margin: 0, color: '#cdd6f4', letterSpacing: '-1px' },
  heroAccent:{ background: 'linear-gradient(135deg,#89b4fa,#cba6f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  heroDesc:  { fontSize: 17, color: '#a6adc8', maxWidth: 560, lineHeight: 1.7, margin: 0 },
  code:      { background: '#313244', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 15, color: '#a6e3a1' },
  btnRow:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  dlBtn: {
    padding: '16px 40px',
    border: 'none',
    borderRadius: 14,
    fontSize: 17,
    fontWeight: 700,
    color: '#1e1e2e',
    transition: 'transform .15s, opacity .15s',
    letterSpacing: '-0.3px',
  },
  dlNote:    { fontSize: 12, color: '#585b70' },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
    gap: 16,
  },
  card:      { background: '#181825', border: '1px solid #313244', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8 },
  cardIcon:  { fontSize: 24 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#cdd6f4' },
  cardDesc:  { fontSize: 13, color: '#6c7086', lineHeight: 1.6 },
  steps: {
    background: '#181825',
    border: '1px solid #313244',
    borderRadius: 16,
    padding: '32px 36px',
  },
  stepsTitle:{ fontSize: 22, fontWeight: 700, color: '#cdd6f4', marginBottom: 28 },
  stepsList: { display: 'flex', flexDirection: 'column', gap: 20 },
  stepItem:  { display: 'flex', alignItems: 'flex-start', gap: 16 },
  stepNum: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'linear-gradient(135deg,#89b4fa,#cba6f7)',
    color: '#1e1e2e', fontSize: 13, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  stepLabel: { fontSize: 15, fontWeight: 600, color: '#cdd6f4' },
  stepSub:   { fontSize: 13, color: '#6c7086', marginTop: 2 },
  demo: {
    background: '#181825',
    border: '1px solid #313244',
    borderRadius: 16,
    padding: '32px 36px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  codeBlock: {
    background: '#11111b',
    border: '1px solid #313244',
    borderRadius: 10,
    padding: '20px 22px',
    fontFamily: "'Fira Code','Cascadia Code',monospace",
    fontSize: 12,
    color: '#a6e3a1',
    overflowX: 'auto',
    lineHeight: 1.7,
    margin: 0,
  },
  demoNote:  { fontSize: 13, color: '#6c7086', lineHeight: 1.6 },
  footer: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid #313244',
    fontSize: 12,
    color: '#45475a',
  },
};
