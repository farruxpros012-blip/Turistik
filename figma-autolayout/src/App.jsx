import { useState, useCallback, useEffect } from 'react';
import { parseHTMLToFigmaTree } from './utils/cssParser';
import CodeEditor from './components/CodeEditor';
import CanvasPreview from './components/CanvasPreview';
import LayersPanel from './components/LayersPanel';
import PropertiesPanel from './components/PropertiesPanel';
import ExportPanel from './components/ExportPanel';
import './index.css';

const DEFAULT_CODE = `<div style="display:flex;flex-direction:row;gap:16px;padding:24px;background-color:#f0f4ff;border-radius:12px;align-items:center;">
  <div style="width:48px;height:48px;background-color:#4f46e5;border-radius:8px;"></div>
  <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
    <div style="width:120px;height:16px;background-color:#1f2937;border-radius:4px;"></div>
    <div style="width:80px;height:12px;background-color:#9ca3af;border-radius:4px;"></div>
  </div>
  <div style="padding:8px 16px;background-color:#4f46e5;border-radius:6px;color:#fff;font-size:14px;">Button</div>
</div>`;

const TABS = ['Qatlamlar', 'Xususiyatlar', 'Eksport'];

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [nodeTree, setNodeTree] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [rightTab, setRightTab] = useState(1);
  const [showEditor, setShowEditor] = useState(true);

  useEffect(() => {
    const tree = parseHTMLToFigmaTree(code);
    setNodeTree(tree);
    setSelectedNode(null);
  }, [code]);

  const handleSelectNode = useCallback((node) => {
    setSelectedNode(node);
    if (node) setRightTab(1);
  }, []);

  const countNodes = (node) => {
    if (!node) return 0;
    return 1 + (node.children || []).reduce((s, c) => s + countNodes(c), 0);
  };

  const countAutoLayout = (node) => {
    if (!node) return 0;
    return (node.hasAutoLayout ? 1 : 0) + (node.children || []).reduce((s, c) => s + countAutoLayout(c), 0);
  };

  const totalNodes = countNodes(nodeTree);
  const autoLayoutNodes = countAutoLayout(nodeTree);

  return (
    <div className="flex flex-col h-screen bg-figma-bg font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-figma-panel border-b border-figma-border flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="2" fill="#18a0fb"/>
              <rect x="13" y="2" width="9" height="9" rx="2" fill="#a259ff"/>
              <rect x="2" y="13" width="9" height="9" rx="2" fill="#1bc47d"/>
              <rect x="13" y="13" width="9" height="4" rx="1" fill="#f24e1e"/>
              <rect x="13" y="19" width="9" height="3" rx="1" fill="#ff7262"/>
            </svg>
            <span className="text-figma-text font-semibold text-sm">
              <span className="gradient-text">AutoLayout</span>
              <span className="text-figma-muted font-normal"> Generator</span>
            </span>
          </div>

          <div className="w-px h-4 bg-figma-border" />

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-figma-muted">
              <span className="text-figma-text font-medium">{totalNodes}</span> node
            </span>
            <span className="text-figma-muted">
              <span className="text-figma-accent font-medium">{autoLayoutNodes}</span> auto-layout
            </span>
          </div>
        </div>

        {/* Center - View toggle */}
        <div className="flex items-center gap-1 bg-figma-hover rounded-md p-0.5">
          <button
            onClick={() => setShowEditor(true)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              showEditor ? 'bg-figma-panel text-figma-text shadow' : 'text-figma-muted'
            }`}
          >
            Kod + Preview
          </button>
          <button
            onClick={() => setShowEditor(false)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              !showEditor ? 'bg-figma-panel text-figma-text shadow' : 'text-figma-muted'
            }`}
          >
            Preview only
          </button>
        </div>

        {/* Right - Info */}
        <div className="flex items-center gap-2 text-[11px] text-figma-muted">
          <span className="hidden md:block">HTML/CSS → Figma Auto-Layout</span>
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-figma-hover rounded text-figma-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-figma-green inline-block" />
            Live
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Layers panel */}
        <div className="w-56 flex-shrink-0 bg-figma-sidebar border-r border-figma-border flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-figma-border">
            <span className="text-figma-muted text-[10px] font-semibold uppercase tracking-wider">Qatlamlar</span>
            <span className="text-figma-muted text-[10px]">{totalNodes}</span>
          </div>
          <LayersPanel
            nodeTree={nodeTree}
            selectedNode={selectedNode}
            onSelect={handleSelectNode}
          />
        </div>

        {/* Center: Code editor + Canvas */}
        <div className={`flex flex-1 overflow-hidden ${showEditor ? 'flex-row' : ''}`}>
          {/* Code editor */}
          {showEditor && (
            <div className="w-[380px] flex-shrink-0 bg-figma-bg border-r border-figma-border flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-figma-border">
                <span className="text-figma-muted text-[10px] font-semibold uppercase tracking-wider">Kod Muharriri</span>
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
              </div>
              <CodeEditor code={code} onChange={setCode} />
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-figma-border bg-figma-panel">
              <span className="text-figma-muted text-[10px] font-semibold uppercase tracking-wider">Canvas</span>
              <div className="flex items-center gap-2 text-[10px] text-figma-muted">
                <span>↑ Auto-layout ko'k</span>
                <span className="w-px h-3 bg-figma-border" />
                <span>↓ Vertikal</span>
              </div>
            </div>
            <CanvasPreview
              nodeTree={nodeTree}
              selectedNode={selectedNode}
              onSelect={handleSelectNode}
            />
          </div>
        </div>

        {/* Right: Tabbed panel */}
        <div className="w-60 flex-shrink-0 bg-figma-sidebar border-l border-figma-border flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-figma-border">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setRightTab(i)}
                className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                  rightTab === i
                    ? 'text-figma-text border-b-2 border-figma-accent -mb-px bg-figma-hover/30'
                    : 'text-figma-muted hover:text-figma-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 0 && (
              <LayersPanel
                nodeTree={nodeTree}
                selectedNode={selectedNode}
                onSelect={handleSelectNode}
              />
            )}
            {rightTab === 1 && (
              <PropertiesPanel node={selectedNode} />
            )}
            {rightTab === 2 && (
              <ExportPanel nodeTree={nodeTree} />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-figma-panel border-t border-figma-border flex-shrink-0">
        <div className="flex items-center gap-4 text-[10px] text-figma-muted">
          {selectedNode ? (
            <span className="text-figma-accent">
              Tanlangan: {selectedNode.name}
              {selectedNode.hasAutoLayout && (
                <span className="ml-2 text-figma-muted">
                  ({selectedNode.layout.mode === 'HORIZONTAL' ? '→ Horizontal' : '↓ Vertical'} Auto-layout)
                </span>
              )}
            </span>
          ) : (
            <span>Element tanlash uchun bosing</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-figma-muted">
          <span>← Qatlamlar paneli</span>
          <span>Canvas ko'rinishi →</span>
          <span>Xususiyatlar →→</span>
        </div>
      </div>
    </div>
  );
}
