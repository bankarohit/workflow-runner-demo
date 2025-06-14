import React from 'react';

export default function LogViewer({ logs }: { logs: string[] }) {
  return (
    <pre style={{ background: '#111', color: '#0f0', padding: '1em', height: '200px', overflow: 'auto' }}>
      {logs.join('\n')}
    </pre>
  );
}
