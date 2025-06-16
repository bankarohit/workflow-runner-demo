import type { NextApiRequest, NextApiResponse } from 'next';
import { WorkflowSpec, saveWorkflow, listWorkflowIds } from '../../../lib/store';
import { logError } from '../../../lib/logger';
import { validateWorkflowSpec } from '../../../lib/specValidator';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      try {
        const spec = req.body as WorkflowSpec;
        validateWorkflowSpec(spec);
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
