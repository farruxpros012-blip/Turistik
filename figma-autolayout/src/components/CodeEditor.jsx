import { useRef } from 'react';

const EXAMPLES = [
  {
    label: 'Flex Row',
    code: `<div style="display:flex;flex-direction:row;gap:16px;padding:24px;background-color:#f0f4ff;border-radius:12px;align-items:center;">
  <div style="width:48px;height:48px;background-color:#4f46e5;border-radius:8px;"></div>
  <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
    <div style="width:120px;height:16px;background-color:#1f2937;border-radius:4px;"></div>
    <div style="width:80px;height:12px;background-color:#9ca3af;border-radius:4px;"></div>
  </div>
  <div style="padding:8px 16px;background-color:#4f46e5;border-radius:6px;color:#fff;font-size:14px;">Button</div>
</div>`,
  },
  {
    label: 'Card Grid',
    code: `<div style="display:flex;flex-direction:column;gap:16px;padding:20px;background-color:#111827;border-radius:16px;width:320px;">
  <div style="display:flex;flex-direction:row;gap:8px;align-items:center;">
    <div style="width:32px;height:32px;background-color:#10b981;border-radius:50%;"></div>
    <div style="flex:1;font-size:16px;color:#f9fafb;">Dashboard</div>
    <div style="width:8px;height:8px;background-color:#10b981;border-radius:50%;"></div>
  </div>
  <div style="display:flex;flex-direction:row;gap:12px;">
    <div style="flex:1;padding:16px;background-color:#1f2937;border-radius:10px;display:flex;flex-direction:column;gap:8px;">
      <div style="width:100%;height:40px;background-color:#374151;border-radius:6px;"></div>
      <div style="width:60%;height:12px;background-color:#6b7280;border-radius:4px;"></div>
    </div>
    <div style="flex:1;padding:16px;background-color:#1f2937;border-radius:10px;display:flex;flex-direction:column;gap:8px;">
      <div style="width:100%;height:40px;background-color:#7c3aed;border-radius:6px;"></div>
      <div style="width:70%;height:12px;background-color:#6b7280;border-radius:4px;"></div>
    </div>
  </div>
</div>`,
  },
  {
    label: 'Nav Bar',
    code: `<nav style="display:flex;flex-direction:row;justify-content:space-between;align-items:center;padding:16px 32px;background-color:#ffffff;border-bottom:1px solid #e5e7eb;width:100%;">
  <div style="display:flex;flex-direction:row;align-items:center;gap:8px;">
    <div style="width:32px;height:32px;background-color:#6366f1;border-radius:8px;"></div>
    <div style="font-size:18px;font-weight:600;color:#111827;">Logo</div>
  </div>
  <div style="display:flex;flex-direction:row;gap:24px;align-items:center;">
    <div style="color:#6b7280;font-size:14px;">Home</div>
    <div style="color:#6b7280;font-size:14px;">About</div>
    <div style="color:#6b7280;font-size:14px;">Work</div>
    <div style="padding:8px 20px;background-color:#6366f1;border-radius:20px;color:#fff;font-size:14px;">Contact</div>
  </div>
</nav>`,
  },
  {
    label: 'Form',
    code: `<form style="display:flex;flex-direction:column;gap:20px;padding:32px;background-color:#fff;border-radius:16px;width:360px;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
  <div style="display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:12px;color:#6b7280;font-weight:500;">Email address</div>
    <div style="padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#374151;background-color:#f9fafb;">user@example.com</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px;">
    <div style="font-size:12px;color:#6b7280;font-weight:500;">Password</div>
    <div style="padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#374151;background-color:#f9fafb;">••••••••</div>
  </div>
  <div style="padding:12px;background-color:#4f46e5;border-radius:8px;color:#fff;font-size:14px;font-weight:500;text-align:center;">Sign In</div>
</form>`,
  },
];

export default function CodeEditor({ code, onChange }) {
  const textareaRef = useRef(null);

  const handleTab = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        textareaRef.current.selectionStart = start + 2;
        textareaRef.current.selectionEnd = start + 2;
      }, 0);
    }
  };

  const loadExample = (example) => {
    onChange(example.code);
  };

  const clearCode = () => onChange('');

  const formatCode = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${code}</div>`, 'text/html');
      const formatted = formatNode(doc.body.firstChild, 0).trim();
      onChange(formatted);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-figma-border flex-wrap">
        <span className="text-figma-muted text-xs mr-1">Misollar:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => loadExample(ex)}
            className="text-[10px] px-2 py-0.5 rounded bg-figma-hover text-figma-text hover:bg-figma-accent hover:text-white transition-colors"
          >
            {ex.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={formatCode}
          className="text-[10px] px-2 py-0.5 rounded bg-figma-hover text-figma-muted hover:text-figma-text transition-colors"
        >
          Format
        </button>
        <button
          onClick={clearCode}
          className="text-[10px] px-2 py-0.5 rounded bg-figma-hover text-figma-muted hover:text-figma-text transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Editor */}
      <div className="relative flex-1 overflow-hidden">
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-figma-bg border-r border-figma-border overflow-hidden pointer-events-none">
          <div className="pt-3 px-1">
            {code.split('\n').map((_, i) => (
              <div key={i} className="text-figma-muted text-[10px] font-mono text-right leading-[1.6] px-1">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleTab}
          spellCheck={false}
          className="code-editor absolute inset-0 bg-figma-bg text-figma-text w-full h-full p-3 pl-12 border-none"
          placeholder={'HTML/CSS kodingizni shu yerga kiriting...\n\nMisol:\n<div style="display:flex;gap:16px;padding:20px;">\n  <div style="width:100px;height:100px;background:#4f46e5;"></div>\n</div>'}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-figma-border bg-figma-bg">
        <span className="text-figma-muted text-[10px]">
          {code.split('\n').length} qator · {code.length} belgi
        </span>
        <span className="text-figma-muted text-[10px]">HTML + Inline CSS</span>
      </div>
    </div>
  );
}

function formatNode(node, depth) {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  if (node.nodeType === 3) {
    const text = node.textContent.trim();
    return text ? `${indent}${text}\n` : '';
  }
  const tag = node.tagName.toLowerCase();
  const attrs = Array.from(node.attributes || [])
    .map(a => `${a.name}="${a.value}"`)
    .join(' ');
  const openTag = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
  if (node.children?.length === 0 && !node.textContent.trim()) {
    return `${indent}${openTag}</${tag}>\n`;
  }
  const children = Array.from(node.childNodes)
    .map(c => formatNode(c, depth + 1))
    .join('');
  return `${indent}${openTag}\n${children}${indent}</${tag}>\n`;
}
