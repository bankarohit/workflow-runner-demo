import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

export default function DagPreview({ spec }: { spec: any }) {
  if (!spec || !Array.isArray(spec.nodes)) return null;
  const nodes = spec.nodes.map((n: any, idx: number) => ({
    id: n.id,
    data: { label: n.id },
    position: { x: idx * 100, y: idx * 50 },
  }));
  const edges: any[] = [];
  spec.nodes.forEach((n: any) => {
    (n.next || []).forEach((nx: any) => {
      const target = typeof nx === 'string' ? nx : nx.id;
      edges.push({ id: `${n.id}-${target}`, source: n.id, target });
    });
  });
  return (
    <div style={{ height: 300 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
