import { WorkflowSpec, PromptNodeSpec, LLMNodeSpec, RunOutput } from './store';

export interface WorkflowEvent {
  type: 'log' | 'error' | 'done';
  message?: string;
  data?: any;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateLLM(prompt: string): Promise<string> {
  // pretend to call an LLM and echo the prompt back
  await delay(100);
  return `LLM response for: ${prompt}`;
}

async function callWithTimeout(fn: () => Promise<string>, timeoutMs: number, retries: number, onEvent?: (ev: WorkflowEvent) => void): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await Promise.race([
        fn(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      return res as string;
    } catch (err) {
      if (attempt >= retries) throw err;
      onEvent?.({ type: 'log', message: 'Retrying after timeout' });
    }
  }
  throw new Error('call failed');
}

export async function runWorkflow(spec: WorkflowSpec, onEvent?: (ev: WorkflowEvent) => void): Promise<RunOutput> {
  const logs: string[] = [];
  function log(msg: string) {
    logs.push(msg);
    onEvent?.({ type: 'log', message: msg });
  }

  try {
    const promptNode = spec.nodes[0] as PromptNodeSpec;
    const llmNode = spec.nodes[1] as LLMNodeSpec;

    log(`Prompting: ${promptNode.prompt}`);
    const result = await callWithTimeout(() => simulateLLM(promptNode.prompt), 1000, 1, onEvent);
    log(`LLM result: ${result}`);

    const output: RunOutput = { logs, status: 'success', output: result };
    onEvent?.({ type: 'done', data: result });
    return output;
  } catch (err: any) {
    const message = err && err.message ? err.message : String(err);
    logs.push(message);
    onEvent?.({ type: 'error', message });
    return { logs, status: 'error', error: message };
  }
}
