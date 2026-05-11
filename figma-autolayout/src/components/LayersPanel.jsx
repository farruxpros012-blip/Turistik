import FigmaNode from './FigmaNode';

export default function LayersPanel({ nodeTree, selectedNode, onSelect }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="py-2">
        {nodeTree ? (
          <FigmaNode
            node={nodeTree}
            onSelect={onSelect}
            selectedNode={selectedNode}
            depth={0}
          />
        ) : (
          <div className="flex items-center justify-center h-20">
            <p className="text-figma-muted text-xs">Qatlamlar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}
