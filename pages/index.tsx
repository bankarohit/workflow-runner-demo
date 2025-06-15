import { useState } from 'react';
import RunLogSubscriber from '../components/RunLogSubscriber';

export default function Home() {
  const [specText, setSpecText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [inputValid, setInputValid] = useState(true);
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

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    try {
      JSON.parse(val || '{}');
      setInputValid(true);
    } catch {
      setInputValid(false);
    }
  };

  const run = async () => {
    if (!isValid || !inputValid) return;
    setRunning(true);
    setWorkflowId(null);
    try {
      const parsed = JSON.parse(specText);
      const input = inputText ? JSON.parse(inputText) : {};
      if (parsed.nodes && parsed.nodes[0] && parsed.nodes[0].type === 'PromptNode') {
        parsed.nodes[0].input = input;
      }
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
      <textarea
        value={inputText}
        onChange={onInputChange}
        rows={4}
        style={{ width: '100%', marginTop: '1em' }}
        placeholder="Runtime input as JSON"
      />
      <div>
        <button
          onClick={run}
          disabled={!isValid || !inputValid || running}
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