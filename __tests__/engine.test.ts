import { runWorkflow, callWithTimeout, WorkflowEvent } from '../lib/engine';
import { WorkflowSpec } from '../lib/store';

describe('runWorkflow', () => {
  test('executes a simple workflow', async () => {
    const spec: WorkflowSpec = {
      id: 'wf1',
      nodes: [
        { id: 'n1', type: 'PromptNode', prompt: 'hello' },
        { id: 'n2', type: 'LLMNode' },
      ],
    };

    const result = await runWorkflow(spec);
    expect(result.status).toBe('success');
    expect(result.output).toBe('LLM response for: hello');
    expect(result.logs).toEqual([
      'Prompting: hello',
      'LLM result: LLM response for: hello',
    ]);
  });
});

describe('callWithTimeout', () => {
  test('retries on timeout', async () => {
    let attempts = 0;
    const events: WorkflowEvent[] = [];
    const fn = jest.fn(async () => {
      attempts++;
      await new Promise((res) => setTimeout(res, attempts === 1 ? 200 : 10));
      return 'done';
    });

    const result = await callWithTimeout(fn, 100, 1, (ev) => events.push(ev));
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(events.some((e) => e.message === 'Retrying after timeout')).toBe(true);
  });
});
