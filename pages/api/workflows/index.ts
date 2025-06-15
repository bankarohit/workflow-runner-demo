import type { NextApiRequest, NextApiResponse } from 'next';
import { WorkflowSpec, saveWorkflow, listWorkflowIds } from '../../../lib/store';
import { logError } from '../../../lib/logger';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      try {
        const spec = req.body as WorkflowSpec;
        if (!spec || !spec.id || !Array.isArray(spec.nodes) || spec.nodes.length !== 2) {
          res.status(400).json({ error: 'Invalid spec' });
          return;
        }
        if (spec.nodes[0].type !== 'PromptNode' || spec.nodes[1].type !== 'LLMNode') {
          res.status(400).json({ error: 'Spec must contain PromptNode then LLMNode' });
          return;
        }
        const prompt = spec.nodes[0] as any;
        if (typeof prompt.template !== 'string' || typeof prompt.input !== 'object') {
          res.status(400).json({ error: 'Prompt node must have template and input' });
          return;
        }
        saveWorkflow(spec);
        res.status(201).json({ id: spec.id, spec });
      } catch (err: any) {
        logError(err);
        res.status(400).json({ error: err.message });
      }
  } else if (req.method === 'GET') {
    res.status(200).json({ ids: listWorkflowIds() });
  } else {
    res.status(405).end();
  }
  } catch (err) {
    logError(err);
    res.status(500).end('Internal error');
  }
}
