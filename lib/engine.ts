import { WorkflowSpec, PromptNodeSpec, LLMNodeSpec, RunOutput, NodeSpec } from './store';
import { Configuration, OpenAIApi } from 'openai';
import { logError } from './logger';

export interface WorkflowEvent {
  node: string;
  status: 'running' | 'success' | 'failure';
  output?: string;
  error?: string;
  timestamp: number;
}

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

export async function callOpenAI(prompt: string, model = 'gpt-3.5-turbo', temperature = 0): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }
  const completion = await openai.createChatCompletion({
    model,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.data.choices[0]?.message?.content?.trim() || '';
}

export async function callWithTimeout(
  fn: () => Promise<string>,
  timeoutMs: number,
  retries: number,
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const res = await Promise.race([
        (async () => {
          const val = await fn();
          if (timer) clearTimeout(timer);
          return val;
        })(),
        new Promise<string>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        }),
      ]);
      return res as string;
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (attempt >= retries) throw err;
    }
  }
  throw new Error('call failed');
}

export function mergePrompt(template: string, input: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (input[key] === undefined) {
      throw new Error(`Missing value for ${key}`);
    }
    return input[key];
  });
}

export async function runWorkflow(
  spec: WorkflowSpec,
  onEvent?: (ev: WorkflowEvent) => void,
): Promise<RunOutput> {
  const logs: string[] = [];
  const outputs: Record<string, string> = {};
  const events: WorkflowEvent[] = [];

  const nodeMap = new Map<string, NodeSpec>();
  for (const n of spec.nodes) {
    nodeMap.set(n.id, n);
  }

  const inDegree = new Map<string, number>();
  for (const n of spec.nodes) {
    inDegree.set(n.id, 0);
  }
  for (const n of spec.nodes) {
    for (const nxt of n.next || []) {
      const id = typeof nxt === 'string' ? nxt : nxt.id;
      inDegree.set(id, (inDegree.get(id) || 0) + 1);
    }
  }

  const ready = spec.nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  const status = new Map<string, 'pending' | 'running' | 'success' | 'failure'>();
  for (const n of spec.nodes) status.set(n.id, 'pending');

  while (ready.length > 0) {
    const batch = [...ready];
    ready.length = 0;
    await Promise.all(
      batch.map(async (id) => {
        const node = nodeMap.get(id)!;
        status.set(id, 'running');
        const startEv: WorkflowEvent = { node: id, status: 'running', timestamp: Date.now() };
        events.push(startEv);
        onEvent?.(startEv);
        let output = '';
        try {
          if (node.type === 'PromptNode') {
            const ctx = { ...(node as PromptNodeSpec).input, ...outputs };
            output = mergePrompt((node as PromptNodeSpec).template, ctx);
            logs.push(`Prompting (${id}): ${output}`);
          } else if (node.type === 'LLMNode') {
            const parents = spec.nodes.filter((n) => (n.next || []).some((nx) => (typeof nx === 'string' ? nx === id : nx.id === id))).map((p) => p.id);
            const prompt = parents.length > 0 ? outputs[parents[0]] : '';
            const { timeoutMs = 1000, retries = 1, model = 'gpt-3.5-turbo', temperature = 0 } = node as LLMNodeSpec;
            output = await callWithTimeout(() => callOpenAI(prompt, model, temperature), timeoutMs, retries);
            logs.push(`LLM result (${id}): ${output}`);
          }
          outputs[id] = output;
          status.set(id, 'success');
          const ev: WorkflowEvent = { node: id, status: 'success', output, timestamp: Date.now() };
          events.push(ev);
          onEvent?.(ev);
        } catch (err: any) {
          const message = err && err.message ? err.message : String(err);
          logError(err);
          logs.push(message);
          status.set(id, 'failure');
          const ev: WorkflowEvent = { node: id, status: 'failure', error: message, timestamp: Date.now() };
          events.push(ev);
          onEvent?.(ev);
          throw err;
        }
        for (const nxt of node.next || []) {
          const id = typeof nxt === 'string' ? nxt : nxt.id;
          const condition = typeof nxt === 'string' ? undefined : nxt.condition;
          let take = true;
          if (condition) {
            try {
              // eslint-disable-next-line no-new-func
              take = Boolean((new Function('output', 'context', `return ${condition};`))(output, outputs));
            } catch (err) {
              take = false;
            }
          }
          if (take) {
            inDegree.set(id, (inDegree.get(id) || 0) - 1);
            if (inDegree.get(id) === 0) {
              ready.push(id);
            }
          }
        }
      })
    ).catch(() => {
      // stop executing remaining nodes on failure
      ready.length = 0;
    });
  }

  if (Array.from(status.values()).includes('failure')) {
    return { logs, status: 'error', error: 'Workflow failed', events };
  }
  const lastId = spec.nodes[spec.nodes.length - 1].id;
  return { logs, status: 'success', output: outputs[lastId], events };
}
