export function validateWorkflowSpec(spec: any): void {
  if (!spec || typeof spec !== 'object') {
    throw new Error('Invalid spec');
  }
  if (typeof spec.id !== 'string') {
    throw new Error('Spec must have id');
  }
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
    throw new Error('Spec must have nodes');
  }
  const ids = new Set<string>();
  for (const node of spec.nodes) {
    if (!node || typeof node !== 'object') {
      throw new Error('Invalid node');
    }
    if (typeof node.id !== 'string') {
      throw new Error('Node missing id');
    }
    if (ids.has(node.id)) {
      throw new Error('Duplicate node id');
    }
    ids.add(node.id);
    if (typeof node.type !== 'string') {
      throw new Error('Node missing type');
    }
    if (node.type === 'PromptNode') {
      if (typeof node.template !== 'string') {
        throw new Error('PromptNode missing template');
      }
      if (node.input && typeof node.input !== 'object') {
        throw new Error('PromptNode input must be object');
      }
    }
    if (node.next) {
      if (!Array.isArray(node.next)) {
        throw new Error('next must be array');
      }
      for (const nxt of node.next) {
        if (!nxt || typeof nxt !== 'object' || typeof nxt.id !== 'string') {
          throw new Error('next entries must have id');
        }
        if (nxt.condition && typeof nxt.condition !== 'string') {
          throw new Error('condition must be string');
        }
      }
    }
    if (node.timeoutMs !== undefined && typeof node.timeoutMs !== 'number') {
      throw new Error('timeoutMs must be number');
    }
    if (node.retries !== undefined && typeof node.retries !== 'number') {
      throw new Error('retries must be number');
    }
    if (node.type === 'LLMNode') {
      if (node.model && typeof node.model !== 'string') {
        throw new Error('model must be string');
      }
      if (node.temperature !== undefined && typeof node.temperature !== 'number') {
        throw new Error('temperature must be number');
      }
    }
  }
  for (const node of spec.nodes) {
    if (node.next) {
      for (const nxt of node.next) {
        const id = typeof nxt === 'string' ? nxt : nxt.id;
        if (!ids.has(id)) {
          throw new Error(`Unknown next node ${id}`);
        }
      }
    }
  }
}
