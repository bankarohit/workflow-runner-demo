import React, { useEffect, useRef, useState } from 'react';
import LogViewer from './LogViewer';

interface Props {
  workflowId: string;
}

export default function RunLogSubscriber({ workflowId }: Props) {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workflowId) return;

    setLogs([]);
    setError(null);
    const es = new EventSource(`/api/workflows/${workflowId}/run`);

    es.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      if (evt.type === 'log') {
        setLogs((prev) => [...prev, evt.message]);
      } else if (evt.type === 'error') {
        setError(evt.message);
      } else if (evt.type === 'done') {
        es.close();
      }
    };

    es.onerror = () => {
      setError('Connection lost');
      es.close();
    };

    return () => es.close();
  }, [workflowId]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  return (
    <div>
      <div ref={containerRef} style={{ maxHeight: 200, overflow: 'auto' }}>
        <LogViewer logs={logs} />
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
