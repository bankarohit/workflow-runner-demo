export interface PromptNodeSpec {
  id: string;
  type: 'PromptNode';
  template: string;
  input: Record<string, string>;
}

export interface LLMNodeSpec {
  id: string;
  type: 'LLMNode';
}

export type NodeSpec = PromptNodeSpec | LLMNodeSpec;

export interface WorkflowSpec {
  id: string;
  nodes: NodeSpec[];
}

export interface RunOutput {
  logs: string[];
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
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
