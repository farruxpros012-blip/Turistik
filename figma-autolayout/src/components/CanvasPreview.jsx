import { useMemo } from 'react';

function px(val) {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function AutoLayoutArrows({ mode, gap }) {
  if (!mode || mode === 'NONE') return null;
  const isHoriz = mode === 'HORIZONTAL';
  return (
    <div className={`absolute inset-0 pointer-events-none flex items-center ${isHoriz ? 'flex-row' : 'flex-col'} justify-center opacity-40`}>
      {gap > 0 && (
        <div
          className="border-dashed border-figma-accent"
          style={{
            borderWidth: isHoriz ? '0 0 0 1px' : '1px 0 0 0',
            width: isHoriz ? `${gap}px` : '1px',
            height: isHoriz ? '1px' : `${gap}px`,
          }}
        />
      )}
    </div>
  );
}

function NodeRect({ node, scale = 1, isSelected, onSelect }) {
  const style = {
    position: 'relative',
    display: 'flex',
    ...(node.layout?.mode === 'HORIZONTAL' && { flexDirection: 'row' }),
    ...(node.layout?.mode === 'VERTICAL' && { flexDirection: 'column' }),
    ...(node.hasAutoLayout && {
      gap: `${node.layout.gap || 0}px`,
      paddingTop: `${node.layout.padding?.top || 0}px`,
      paddingRight: `${node.layout.padding?.right || 0}px`,
      paddingBottom: `${node.layout.padding?.bottom || 0}px`,
      paddingLeft: `${node.layout.padding?.left || 0}px`,
    }),
    ...(node.sizing?.widthMode === 'FILL' ? { flex: 1, width: '100%' } : {}),
    ...(node.sizing?.widthMode === 'FIXED' && px(node.sizing?.width) > 0
      ? { width: `${px(node.sizing.width) * scale}px` } : {}),
    ...(node.sizing?.heightMode === 'FILL' ? { alignSelf: 'stretch' } : {}),
    ...(node.sizing?.heightMode === 'FIXED' && px(node.sizing?.height) > 0
      ? { height: `${px(node.sizing.height) * scale}px` } : {}),
    ...(node.style?.backgroundColor && { background: node.style.backgroundColor }),
    ...(node.style?.borderRadius && { borderRadius: node.style.borderRadius }),
    ...(node.style?.border && { border: node.style.border }),
    ...(node.style?.boxShadow && { boxShadow: node.style.boxShadow }),
    minWidth: node.hasAutoLayout ? undefined : '40px',
    minHeight: node.hasAutoLayout ? undefined : '24px',
    outline: isSelected ? '2px solid #18a0fb' : '1px solid rgba(255,255,255,0.12)',
    outlineOffset: isSelected ? '1px' : '0',
    cursor: 'pointer',
    transition: 'outline 0.15s ease',
    boxSizing: 'border-box',
  };

  const hasPaddingViz = node.hasAutoLayout && (
    (node.layout?.padding?.top || 0) +
    (node.layout?.padding?.right || 0) +
    (node.layout?.padding?.bottom || 0) +
    (node.layout?.padding?.left || 0) > 0
  );

  return (
    <div style={style} onClick={(e) => { e.stopPropagation(); onSelect(node); }} title={node.name}>
      {/* Padding visualization overlay */}
      {hasPaddingViz && isSelected && (
        <>
          {/* Top padding */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${node.layout.padding.top * scale}px`, background: 'rgba(255,107,107,0.15)', pointerEvents: 'none' }} />
          {/* Bottom padding */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${node.layout.padding.bottom * scale}px`, background: 'rgba(255,107,107,0.15)', pointerEvents: 'none' }} />
          {/* Left padding */}
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${node.layout.padding.left * scale}px`, background: 'rgba(255,107,107,0.15)', pointerEvents: 'none' }} />
          {/* Right padding */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: `${node.layout.padding.right * scale}px`, background: 'rgba(255,107,107,0.15)', pointerEvents: 'none' }} />
        </>
      )}

      {/* Auto-layout direction indicator */}
      {node.hasAutoLayout && (
        <div style={{
          position: 'absolute',
          top: 2, right: 2,
          fontSize: '8px',
          background: node.layout.mode === 'HORIZONTAL' ? '#18a0fb' : '#a259ff',
          color: '#fff',
          borderRadius: '2px',
          padding: '1px 3px',
          pointerEvents: 'none',
          opacity: 0.8,
          zIndex: 10,
        }}>
          {node.layout.mode === 'HORIZONTAL' ? '→' : '↓'}
        </div>
      )}

      {/* Leaf node label */}
      {node.children?.length === 0 && (
        <div style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.5)',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          minHeight: '24px',
        }}>
          {node.name}
        </div>
      )}

      {/* Children */}
      {node.children?.map((child, i) => (
        <NodeRect
          key={`${child.name}-${i}`}
          node={child}
          scale={scale}
          isSelected={isSelected && false}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function CanvasPreview({ nodeTree, selectedNode, onSelect }) {
  if (!nodeTree) {
    return (
      <div className="flex-1 canvas-grid flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">⬚</div>
          <p className="text-figma-muted text-sm">HTML/CSS kodingizni kiriting</p>
          <p className="text-figma-muted text-xs mt-1">Figma auto-layout sifatida ko'rsatiladi</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 canvas-grid flex items-center justify-center p-8 overflow-auto"
      onClick={() => onSelect(null)}
    >
      <div className="relative">
        {/* Canvas label */}
        <div className="absolute -top-6 left-0 text-[10px] text-figma-muted font-mono">
          Canvas
        </div>

        {/* Node visualization */}
        <NodeRect
          node={nodeTree}
          scale={1}
          isSelected={selectedNode?.name === nodeTree.name && selectedNode?.depth === nodeTree.depth}
          onSelect={onSelect}
        />
      </div>
    </div>
  );
}
