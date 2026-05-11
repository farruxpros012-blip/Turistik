import { useState } from 'react';
import { nodeToFigmaJSON, generatePluginCode } from '../utils/cssParser';

export default function ExportPanel({ nodeTree }) {
  const [tab, setTab] = useState('json');
  const [copied, setCopied] = useState(false);

  const figmaJSON = nodeTree ? nodeToFigmaJSON(nodeTree) : null;
  const pluginCode = nodeTree ? generatePluginCode(nodeTree) : null;

  const content = tab === 'json'
    ? JSON.stringify(figmaJSON, null, 2)
    : pluginCode;

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!nodeTree) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-figma-muted text-xs text-center">
          HTML/CSS kiriting,<br />keyin eksport qiling
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-figma-border">
        {[
          { id: 'json', label: 'Figma JSON' },
          { id: 'plugin', label: 'Plugin Kodi' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'text-figma-accent border-b-2 border-figma-accent -mb-px'
                : 'text-figma-muted hover:text-figma-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative">
        <pre className="p-3 text-[10px] font-mono text-figma-text whitespace-pre-wrap leading-relaxed">
          {content || '// Bo\'sh'}
        </pre>
      </div>

      {/* Copy button */}
      <div className="p-2 border-t border-figma-border">
        <button
          onClick={handleCopy}
          className={`w-full py-2 rounded text-xs font-medium transition-all ${
            copied
              ? 'bg-figma-green text-white'
              : 'bg-figma-accent text-white hover:bg-blue-500'
          }`}
        >
          {copied ? '✓ Nusxa olindi!' : 'Nusxa olish'}
        </button>

        {tab === 'plugin' && (
          <p className="text-figma-muted text-[10px] mt-2 text-center">
            Figma → Plugins → Development → Run script
          </p>
        )}
      </div>
    </div>
  );
}
