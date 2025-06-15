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

import indexHandler from '../pages/api/workflows/index';
import runHandler from '../pages/api/workflows/[id]/run';
import latestHandler from '../pages/api/workflows/[id]/latest';
import { saveWorkflow, getRun, WorkflowSpec } from '../lib/store';

function mockReq(method: string, body?: any, query: any = {}) {
  return { method, body, query } as any;
}

function mockRes() {
  const res: any = { headers: {} };
  res.statusCode = 200;
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (d: any) => { res.data = d; return res; };
  res.end = (d?: any) => { res.ended = true; if (d) res.data = d; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.write = (chunk: string) => { res.written = (res.written || '') + chunk; };
  return res;
}

describe('workflows API', () => {
  test('accepts valid workflow spec', () => {
    const spec: WorkflowSpec = {
      id: 'a',
      nodes: [
        { id: 'p', type: 'PromptNode', prompt: 'hi' },
        { id: 'l', type: 'LLMNode' },
      ],
    };
    const req = mockReq('POST', spec);
    const res = mockRes();
    indexHandler(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.data).toEqual({ id: 'a', spec });
  });

  test('rejects invalid spec', () => {
    const spec = { id: 'bad', nodes: [] };
    const req = mockReq('POST', spec);
    const res = mockRes();
    indexHandler(req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe('run route', () => {
  test('404 if spec missing', async () => {
    const req = mockReq('POST', undefined, { id: 'missing' });
    const res = mockRes();
    await runHandler(req, res);
    expect(res.statusCode).toBe(404);
  });

  test('streams events for valid workflow', async () => {
    const spec: WorkflowSpec = {
      id: 'stream',
      nodes: [
        { id: 'p', type: 'PromptNode', prompt: 'test' },
        { id: 'l', type: 'LLMNode' },
      ],
    };
    saveWorkflow(spec);
    const req = mockReq('POST', undefined, { id: 'stream' });
    const res = mockRes();
    await runHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.written).toContain('"node":"p"');
    expect(res.written).toContain('"status":"running"');
    expect(res.written).toMatch(/"node":"l".*"status":"success"/s);
  });

  test('persists latest run result', async () => {
    const spec: WorkflowSpec = {
      id: 'persist',
      nodes: [
        { id: 'p', type: 'PromptNode', prompt: 'hi' },
        { id: 'l', type: 'LLMNode' },
      ],
    };
    saveWorkflow(spec);
    const req = mockReq('POST', undefined, { id: 'persist' });
    const res = mockRes();
    await runHandler(req, res);
    const run1 = getRun('persist');
    expect(run1?.output).toBe('LLM response for: hi');

    // run again with different prompt to ensure overwrite
    const spec2: WorkflowSpec = {
      id: 'persist',
      nodes: [
        { id: 'p', type: 'PromptNode', prompt: 'bye' },
        { id: 'l', type: 'LLMNode' },
      ],
    };
    saveWorkflow(spec2);
    const req2 = mockReq('POST', undefined, { id: 'persist' });
    const res2 = mockRes();
    await runHandler(req2, res2);
    const run2 = getRun('persist');
    expect(run2?.output).toBe('LLM response for: bye');
  });

  test('latest run endpoint returns result', async () => {
    const run = getRun('persist');
    const req = mockReq('GET', undefined, { id: 'persist' });
    const res = mockRes();
    latestHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data).toEqual(run);
  });

  test('latest run endpoint 404 for missing', () => {
    const req = mockReq('GET', undefined, { id: 'none' });
    const res = mockRes();
    latestHandler(req, res);
    expect(res.statusCode).toBe(404);
  });
});
