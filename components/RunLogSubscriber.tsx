import React, { useEffect, useRef, useState } from 'react';
import LogViewer from './LogViewer';

interface Props {
  workflowId: string;
  onDone?: () => void;
}
export default function RunLogSubscriber({ workflowId, onDone }: Props) {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workflowId) return;

    setLogs([]);
    setError(null);
    const es = new EventSource(`/api/workflows/${workflowId}/run`);
    let closed = false;
    const close = () => {
      if (!closed) {
        closed = true;
        es.close();
        onDone?.();
      }
    };

    es.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      if (evt.status === 'running') {
        setLogs((prev) => [...prev, `${evt.node} running`]);
      } else if (evt.status === 'success') {
        const msg = evt.output ? `${evt.node} success: ${evt.output}` : `${evt.node} success`;
        setLogs((prev) => [...prev, msg]);
      } else if (evt.status === 'failure') {
        setLogs((prev) => [...prev, `Failure: ${evt.error}`]);
        setError(evt.error || 'failure');
      }
    };

    es.onerror = () => {
      setError('Connection lost');
      close();
    };

    return close;
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
