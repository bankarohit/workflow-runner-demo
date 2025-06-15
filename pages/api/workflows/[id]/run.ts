import type { NextApiRequest, NextApiResponse } from 'next';
import { getWorkflow, saveRun } from '../../../../lib/store';
import { runWorkflow, WorkflowEvent } from '../../../../lib/engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const id = req.query.id as string;
  const spec = getWorkflow(id);
  if (!spec) {
    res.status(404).end('Not found');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const events: WorkflowEvent[] = [];

  await runWorkflow(spec, (ev) => {
    events.push(ev);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }).then((result) => saveRun(id, result));

  res.end();
}
