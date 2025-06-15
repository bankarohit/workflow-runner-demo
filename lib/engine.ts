import { WorkflowSpec, PromptNodeSpec, LLMNodeSpec, RunOutput } from './store';

export interface WorkflowEvent {
  node: string;
  status: 'running' | 'success' | 'failure';
  output?: string;
  error?: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateLLM(prompt: string): Promise<string> {
  // pretend to call an LLM and echo the prompt back
  await delay(100);
  return `LLM response for: ${prompt}`;
}

export async function callWithTimeout(
  fn: () => Promise<string>,
  timeoutMs: number,
  retries: number,
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await Promise.race([
        fn(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      return res as string;
    } catch (err) {
      if (attempt >= retries) throw err;
    }
  }
  throw new Error('call failed');
}

export async function runWorkflow(
  spec: WorkflowSpec,
  onEvent?: (ev: WorkflowEvent) => void,
): Promise<RunOutput> {
  const logs: string[] = [];

  const promptNode = spec.nodes[0] as PromptNodeSpec;
  const llmNode = spec.nodes[1] as LLMNodeSpec;

  onEvent?.({ node: promptNode.id, status: 'running' });
  logs.push(`Prompting: ${promptNode.prompt}`);
  onEvent?.({ node: promptNode.id, status: 'success', output: promptNode.prompt });

  onEvent?.({ node: llmNode.id, status: 'running' });
  try {
    const result = await callWithTimeout(() => simulateLLM(promptNode.prompt), 1000, 1);
    logs.push(`LLM result: ${result}`);
    onEvent?.({ node: llmNode.id, status: 'success', output: result });
    return { logs, status: 'success', output: result };
  } catch (err: any) {
    const message = err && err.message ? err.message : String(err);
    logs.push(message);
    onEvent?.({ node: llmNode.id, status: 'failure', error: message });
    return { logs, status: 'error', error: message };
  }
}
