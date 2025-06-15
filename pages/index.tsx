import { useState } from 'react';
import LogViewer from '../components/LogViewer';

export default function Home() {
  const [spec, setSpec] = useState(`{
  "id": "demo",
  "nodes": [
    { "id": "p1", "type": "PromptNode", "prompt": "Hello" },
    { "id": "l1", "type": "LLMNode" }
  ]
}`);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setLogs([]);
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: spec,
      });
      if (!response.ok) {
        const err = await response.json();
        setLogs([`Error: ${err.error}`]);
        return;
      }
      const data = await response.json();
      const id = data.id;

      const es = new EventSource(`/api/workflows/${id}/run`);
      setRunning(true);
      es.onmessage = (e) => {
        const evt = JSON.parse(e.data);
        if (evt.type === 'log') {
          setLogs((prev) => [...prev, evt.message]);
        } else if (evt.type === 'error') {
          setLogs((prev) => [...prev, `Error: ${evt.message}`]);
          es.close();
          setRunning(false);
        } else if (evt.type === 'done') {
          setLogs((prev) => [...prev, 'Done']);
          es.close();
          setRunning(false);
        }
      };
      es.onerror = () => {
        es.close();
        setRunning(false);
      };
    } catch (err: any) {
      setLogs([`Error: ${err.message}`]);
    }
  };

  return (
    <div style={{ padding: '1em' }}>
      <textarea value={spec} onChange={(e) => setSpec(e.target.value)} rows={10} cols={80} />
      <div>
        <button onClick={run} disabled={running} style={{ marginTop: '1em' }}>
          Run Workflow
        </button>
      </div>
      <LogViewer logs={logs} />
    </div>
  );
}
