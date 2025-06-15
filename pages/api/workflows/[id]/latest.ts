import type { NextApiRequest, NextApiResponse } from 'next';
import { getRun } from '../../../../lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }
  const id = req.query.id as string;
  const run = getRun(id);
  if (!run) {
    res.status(404).end('Not found');
    return;
  }
  res.status(200).json(run);
}
