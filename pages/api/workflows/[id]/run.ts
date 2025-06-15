import type { NextApiRequest, NextApiResponse } from 'next';
import { getWorkflow, saveRun } from '../../../../lib/store';
import { runWorkflow } from '../../../../lib/engine';
import { logError } from '../../../../lib/logger';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
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

  try {
    await runWorkflow(spec, (ev) => {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    }).then((result) => saveRun(id, result));
  } catch (err) {
    logError(err);
    res.write(`data: ${JSON.stringify({ node: 'server', status: 'failure', error: 'Internal error' })}\n\n`);
  } finally {
    res.end();
  }
}
