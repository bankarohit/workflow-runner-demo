export interface NextStep {
  id: string;
  condition?: string;
}

export interface BaseNodeSpec {
  id: string;
  type: string;
  next?: NextStep[];
  timeoutMs?: number;
  retries?: number;
}

export interface PromptNodeSpec extends BaseNodeSpec {
  type: 'PromptNode';
  template: string;
  input: Record<string, string>;
}

export interface LLMNodeSpec extends BaseNodeSpec {
  type: 'LLMNode';
  model?: string;
  temperature?: number;
}

export type NodeSpec = PromptNodeSpec | LLMNodeSpec;

export interface WorkflowSpec {
  id: string;
  nodes: NodeSpec[];
}

export interface RunTraceEvent {
  node: string;
  status: 'running' | 'success' | 'failure';
  output?: string;
  error?: string;
  timestamp: number;
}

export interface RunOutput {
  logs: string[];
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
  events: RunTraceEvent[];
}

const workflowStore = new Map<string, WorkflowSpec>();
const runStore = new Map<string, RunOutput>();

export function saveWorkflow(spec: WorkflowSpec) {
  workflowStore.set(spec.id, spec);
}

export function getWorkflow(id: string): WorkflowSpec | undefined {
  return workflowStore.get(id);
}

export function listWorkflowIds(): string[] {
  return Array.from(workflowStore.keys());
}

export function saveRun(id: string, run: RunOutput) {
  runStore.set(id, run);
}

export function getRun(id: string): RunOutput | undefined {
  return runStore.get(id);
}
