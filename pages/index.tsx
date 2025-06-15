import { useState } from 'react';
import RunLogSubscriber from '../components/RunLogSubscriber';

export default function Home() {
  const [specText, setSpecText] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSpecText(val);
    try {
      JSON.parse(val);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  const run = async () => {
    if (!isValid) return;
    setRunning(true);
    setWorkflowId(null);
    try {
      const parsed = JSON.parse(specText);
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!response.ok) {
        const err = await response.json();
        alert(err.error);
        setRunning(false);
        return;
      }
      const data = await response.json();
      setWorkflowId(data.id);
    } catch (err: any) {
      alert(err.message);
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: '1em' }}>
      <textarea
        value={specText}
        onChange={onChange}
        rows={10}
        style={{ width: '100%' }}
      />
      <div>
        <button
          onClick={run}
          disabled={!isValid || running}
          style={{ marginTop: '1em' }}
        >
          Run Workflow
        </button>
      </div>
      {workflowId && (
        <RunLogSubscriber
          workflowId={workflowId}
          onDone={() => setRunning(false)}
        />
      )}
    </div>
  );
}