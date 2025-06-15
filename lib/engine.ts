import { WorkflowSpec, PromptNodeSpec, LLMNodeSpec, RunOutput } from './store';
import { Configuration, OpenAIApi } from 'openai';
import { logError } from './logger';

export interface WorkflowEvent {
  node: string;
  status: 'running' | 'success' | 'failure';
  output?: string;
  error?: string;
}

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

export async function callOpenAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
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

  const promptNode = spec.nodes[0] as PromptNodeSpec;
  const llmNode = spec.nodes[1] as LLMNodeSpec;

  onEvent?.({ node: promptNode.id, status: 'running' });
  let prompt: string;
  try {
    prompt = mergePrompt(promptNode.template, promptNode.input || {});
  } catch (err: any) {
    const msg = err && err.message ? err.message : String(err);
    logError(err);
    logs.push(msg);
    onEvent?.({ node: promptNode.id, status: 'failure', error: msg });
    return { logs, status: 'error', error: msg };
  }
  logs.push(`Prompting: ${prompt}`);
  onEvent?.({ node: promptNode.id, status: 'success', output: prompt });

  onEvent?.({ node: llmNode.id, status: 'running' });
  try {
    const result = await callWithTimeout(() => callOpenAI(prompt), 1000, 1);
    logs.push(`LLM result: ${result}`);
    onEvent?.({ node: llmNode.id, status: 'success', output: result });
    return { logs, status: 'success', output: result };
  } catch (err: any) {
    const message = err && err.message ? err.message : String(err);
    logError(err);
    logs.push(message);
    onEvent?.({ node: llmNode.id, status: 'failure', error: message });
    return { logs, status: 'error', error: message };
  }
}
