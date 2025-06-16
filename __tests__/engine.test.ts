jest.mock('openai', () => {
  return {
    Configuration: jest.fn(),
    OpenAIApi: jest.fn().mockImplementation(() => ({
      createChatCompletion: jest.fn(async ({ messages }) => ({
        data: { choices: [{ message: { content: `LLM response for: ${messages[0].content}` } }] },
      })),
    })),
  };
});
process.env.OPENAI_API_KEY = 'test';

import { runWorkflow, callWithTimeout, WorkflowEvent, mergePrompt } from '../lib/engine';
import { WorkflowSpec } from '../lib/store';

describe('runWorkflow', () => {
  test('executes a simple workflow', async () => {
    const spec: WorkflowSpec = {
      id: 'wf1',
      nodes: [
        { id: 'n1', type: 'PromptNode', template: 'hello', input: {}, next: [{ id: 'n2' }] },
        { id: 'n2', type: 'LLMNode' },
      ],
    };

    const result = await runWorkflow(spec);
    expect(result.status).toBe('success');
    expect(result.output).toBe('LLM response for: hello');
    expect(result.logs).toEqual([
      'Prompting (n1): hello',
      'LLM result (n2): LLM response for: hello',
    ]);
    expect(result.events.length).toBeGreaterThan(0);
  });

  test('emits structured events', async () => {
    const spec: WorkflowSpec = {
      id: 'wf2',
      nodes: [
        { id: 'p', type: 'PromptNode', template: 'hi', input: {}, next: [{ id: 'l' }] },
        { id: 'l', type: 'LLMNode' },
      ],
    };
    const events: WorkflowEvent[] = [];
    await runWorkflow(spec, (e) => events.push(e));
    expect(events[0].node).toBe('p');
    expect(events[0].status).toBe('running');
    expect(events[1].node).toBe('p');
    expect(events[1].status).toBe('success');
    expect(events[1].output).toBe('hi');
    expect(events[2].node).toBe('l');
    expect(events[2].status).toBe('running');
    expect(events[3].node).toBe('l');
    expect(['success', 'failure']).toContain(events[3].status);
  });
});

describe('mergePrompt', () => {
  test('replaces placeholders', () => {
    const result = mergePrompt('Hello {{name}}', { name: 'Bob' });
    expect(result).toBe('Hello Bob');
  });

  test('throws for missing input', () => {
    expect(() => mergePrompt('Hi {{name}}', {})).toThrow('Missing value for name');
  });
});

describe('callWithTimeout', () => {
  test('retries on timeout', async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      await new Promise((res) => setTimeout(res, attempts === 1 ? 200 : 10));
      return 'done';
    });

    const result = await callWithTimeout(fn, 100, 1);
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
