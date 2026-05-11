function PropRow({ label, value, accent }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-figma-muted text-xs">{label}</span>
      <span className={`text-xs font-mono ${accent ? 'text-figma-accent' : 'text-figma-text'}`}>
        {String(value)}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-figma-muted mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function AlignmentGrid({ justifyContent, alignItems, mode }) {
  const isHoriz = mode === 'HORIZONTAL';

  const positions = [
    ['MIN', 'MIN'],
    ['MIN', 'CENTER'],
    ['MIN', 'MAX'],
    ['CENTER', 'MIN'],
    ['CENTER', 'CENTER'],
    ['CENTER', 'MAX'],
    ['MAX', 'MIN'],
    ['MAX', 'CENTER'],
    ['MAX', 'MAX'],
    ['SPACE_BETWEEN', 'MIN'],
  ];

  const isCurrent = (j, a) => {
    const primary = isHoriz ? justifyContent : alignItems;
    const counter = isHoriz ? alignItems : justifyContent;
    return primary === j && counter === a;
  };

  return (
    <div className="grid grid-cols-3 gap-0.5 w-20 h-20 bg-figma-border rounded p-1">
      {positions.slice(0, 9).map(([j, a], i) => (
        <div
          key={i}
          className={`rounded-sm flex items-center justify-center ${
            isCurrent(j, a) ? 'bg-figma-accent' : 'bg-figma-hover'
          }`}
          title={`Primary: ${j}, Counter: ${a}`}
        />
      ))}
    </div>
  );
}

function PaddingViz({ padding }) {
  const { top, right, bottom, left } = padding || {};
  return (
    <div className="grid grid-cols-3 gap-1 items-center text-center text-[10px]">
      <div />
      <div className="bg-figma-hover rounded px-1 py-0.5 text-figma-text">{top || 0}</div>
      <div />
      <div className="bg-figma-hover rounded px-1 py-0.5 text-figma-text">{left || 0}</div>
      <div className="border border-figma-border rounded h-6 flex items-center justify-center text-figma-muted">□</div>
      <div className="bg-figma-hover rounded px-1 py-0.5 text-figma-text">{right || 0}</div>
      <div />
      <div className="bg-figma-hover rounded px-1 py-0.5 text-figma-text">{bottom || 0}</div>
      <div />
    </div>
  );
}

function ColorSwatch({ color, label }) {
  if (!color) return null;
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded border border-white/20 flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-figma-text text-xs font-mono">{color}</span>
    </div>
  );
}

export default function PropertiesPanel({ node }) {
  if (!node) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2 opacity-20">ⓘ</div>
          <p className="text-figma-muted text-xs">Element tanlang</p>
        </div>
      </div>
    );
  }

  const { layout, sizing, style } = node;
  const hasPadding = layout?.padding && (
    layout.padding.top || layout.padding.right ||
    layout.padding.bottom || layout.padding.left
  );

  return (
    <div className="p-3 overflow-y-auto h-full space-y-1">
      {/* Node name */}
      <div className="mb-4">
        <div className="text-figma-text font-medium text-sm truncate">{node.name}</div>
        <div className="text-figma-muted text-xs mt-0.5">
          {'<'}{node.tag}{'>'} · Depth: {node.depth}
        </div>
      </div>

      <hr className="section-divider mb-3" />

      {/* Auto Layout */}
      {node.hasAutoLayout && (
        <Section title="Auto Layout">
          <div className="flex items-start gap-3 mb-2">
            <AlignmentGrid
              justifyContent={layout.justifyContent}
              alignItems={layout.alignItems}
              mode={layout.mode}
            />
            <div className="flex-1 space-y-1">
              <PropRow
                label="Direction"
                value={layout.mode === 'HORIZONTAL' ? '→ Horizontal' : '↓ Vertical'}
                accent
              />
              <PropRow label="Gap" value={`${layout.gap || 0}px`} />
              <PropRow label="Align" value={layout.alignItems} />
              <PropRow label="Justify" value={layout.justifyContent} />
              {layout.flexWrap && <PropRow label="Wrap" value="Yes" accent />}
            </div>
          </div>

          {hasPadding && (
            <>
              <div className="text-[10px] text-figma-muted mb-1">Padding</div>
              <PaddingViz padding={layout.padding} />
            </>
          )}
        </Section>
      )}

      {!node.hasAutoLayout && (
        <Section title="Layout">
          <PropRow label="Mode" value="None (Absolute)" />
        </Section>
      )}

      <hr className="section-divider mb-3" />

      {/* Sizing */}
      <Section title="Sizing">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-figma-muted mb-1">Width</div>
            <div className="bg-figma-hover rounded px-2 py-1 text-xs font-mono text-figma-text">
              {sizing?.widthMode === 'FILL'
                ? <span className="text-figma-accent">Fill</span>
                : sizing?.width || 'Hug'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-figma-muted mb-1">Height</div>
            <div className="bg-figma-hover rounded px-2 py-1 text-xs font-mono text-figma-text">
              {sizing?.heightMode === 'FILL'
                ? <span className="text-figma-accent">Fill</span>
                : sizing?.height || 'Hug'}
            </div>
          </div>
        </div>
        {sizing?.minWidth && <PropRow label="Min Width" value={sizing.minWidth} />}
        {sizing?.maxWidth && <PropRow label="Max Width" value={sizing.maxWidth} />}
      </Section>

      <hr className="section-divider mb-3" />

      {/* Style */}
      <Section title="Style">
        {style?.backgroundColor && (
          <div className="mb-2">
            <div className="text-[10px] text-figma-muted mb-1">Fill</div>
            <ColorSwatch color={style.backgroundColor} />
          </div>
        )}
        {style?.borderRadius && <PropRow label="Radius" value={style.borderRadius} />}
        {style?.color && (
          <div className="mb-2">
            <div className="text-[10px] text-figma-muted mb-1">Text Color</div>
            <ColorSwatch color={style.color} />
          </div>
        )}
        {style?.fontSize && <PropRow label="Font Size" value={style.fontSize} />}
        {style?.fontWeight && <PropRow label="Font Weight" value={style.fontWeight} />}
        {style?.opacity && <PropRow label="Opacity" value={style.opacity} />}
        {style?.boxShadow && <PropRow label="Shadow" value={style.boxShadow} />}
        {style?.border && <PropRow label="Border" value={style.border} />}
        {!style?.backgroundColor && !style?.borderRadius && !style?.color && !style?.border && (
          <div className="text-figma-muted text-xs">No styles detected</div>
        )}
      </Section>

      {/* Children count */}
      {node.children?.length > 0 && (
        <>
          <hr className="section-divider mb-3" />
          <Section title="Children">
            <PropRow label="Count" value={node.children.length} />
          </Section>
        </>
      )}
    </div>
  );
}
