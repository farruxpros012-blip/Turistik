import { useState } from 'react';

const ALIGN_ICONS = {
  MIN: '↑',
  CENTER: '↕',
  MAX: '↓',
  STRETCH: '⇕',
  SPACE_BETWEEN: '↔',
};

const DIR_ICONS = {
  HORIZONTAL: '→',
  VERTICAL: '↓',
  NONE: '□',
  GRID: '⊞',
};

function colorDot(color) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-3 h-3 rounded-sm border border-white/20 flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function sizeLabel(mode, val) {
  if (mode === 'FILL') return <span className="text-figma-accent">Fill</span>;
  if (!val || val === 'auto') return <span className="text-figma-muted">Hug</span>;
  return <span className="text-figma-text">{val}</span>;
}

export default function FigmaNode({ node, onSelect, selectedNode, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const isSelected = selectedNode?.name === node.name && selectedNode?.depth === node.depth;
  const hasChildren = node.children && node.children.length > 0;

  const directionColor = {
    HORIZONTAL: '#18a0fb',
    VERTICAL: '#a259ff',
    NONE: '#8c8c8c',
    GRID: '#1bc47d',
  }[node.layout?.mode || 'NONE'];

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        className={`flex items-center gap-1.5 py-0.5 px-2 rounded cursor-pointer text-xs group
          ${isSelected ? 'bg-figma-accent/20 text-figma-text' : 'hover:bg-figma-hover text-figma-text'}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            className="w-3 h-3 flex items-center justify-center text-figma-muted hover:text-figma-text flex-shrink-0"
            onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className="w-3 flex-shrink-0" />
        )}

        {/* Node type icon */}
        <span
          className="text-[10px] w-4 flex-shrink-0 flex items-center justify-center font-bold"
          style={{ color: directionColor }}
          title={node.layout?.mode}
        >
          {node.hasAutoLayout ? DIR_ICONS[node.layout?.mode || 'NONE'] : '□'}
        </span>

        {/* Node name */}
        <span className="flex-1 truncate font-mono text-[11px]">{node.name}</span>

        {/* Sizing badges */}
        <div className="hidden group-hover:flex items-center gap-1 text-[10px]">
          {sizeLabel(node.sizing?.widthMode, node.sizing?.width)}
          <span className="text-figma-muted">×</span>
          {sizeLabel(node.sizing?.heightMode, node.sizing?.height)}
        </div>

        {/* Color dot */}
        {node.style?.backgroundColor && (
          <div className="ml-1 flex-shrink-0">
            {colorDot(node.style.backgroundColor)}
          </div>
        )}

        {/* Auto-layout badge */}
        {node.hasAutoLayout && (
          <span
            className="text-[9px] px-1 py-0.5 rounded-sm font-medium flex-shrink-0"
            style={{ background: directionColor + '22', color: directionColor }}
          >
            AL
          </span>
        )}
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-px bg-figma-border"
            style={{ left: `${depth * 16 + 16}px` }}
          />
          {node.children.map((child, i) => (
            <FigmaNode
              key={`${child.name}-${i}`}
              node={child}
              onSelect={onSelect}
              selectedNode={selectedNode}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
