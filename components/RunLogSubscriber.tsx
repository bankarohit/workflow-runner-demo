import React, { useEffect, useRef, useState } from 'react';
import LogViewer from './LogViewer';

interface Props {
  workflowId: string;
  onDone?: () => void;
}
export default function RunLogSubscriber({ workflowId, onDone }: Props) {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workflowId) return;

    setLogs([]);
    setError(null);
    setFinished(null);
    const controller = new AbortController();
    let reconnect = 0;
    const connect = () => {
      fetch(`/api/workflows/${workflowId}/run`, { method: 'POST', signal: controller.signal })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            throw new Error('connection failed');
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let lastError: string | null = null;
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              const line = part.trim();
              if (line.startsWith('data: ')) {
                const evt = JSON.parse(line.slice(6));
                if (evt.status === 'running') {
                  setLogs((prev) => [...prev, `${evt.node} running`]);
                } else if (evt.status === 'success') {
                  const msg = evt.output ? `${evt.node} success: ${evt.output}` : `${evt.node} success`;
                  setLogs((prev) => [...prev, msg]);
                } else if (evt.status === 'failure') {
                  setLogs((prev) => [...prev, `Failure: ${evt.error}`]);
                  lastError = evt.error || 'failure';
                  setError(lastError);
                }
              }
            }
          }
          setFinished(lastError ? `Workflow failed: ${lastError}` : 'Workflow succeeded');
          onDone?.();
        })
        .catch((err) => {
          if (reconnect < 1 && controller.signal.reason === undefined) {
            reconnect++;
            connect();
          } else if (!controller.signal.aborted) {
            setError('Connection lost');
            onDone?.();
          }
        });
    };
    connect();
    return () => controller.abort();
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
      {finished && !error && <div>{finished}</div>}
    </div>
  );
}
