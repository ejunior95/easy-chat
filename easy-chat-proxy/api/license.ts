import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connectToDatabase } from '../configs/database/mongo';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  const db = await connectToDatabase(process.env.MONGODB_URI as string);
  
  const license = await db.collection('licenses').findOne({ stripe_session_id: session_id });

  if (!license) {
    return res.status(404).json({ error: 'Licença ainda não gerada. Aguarde...' });
  }

  return res.json({ 
    key: license.key, 
    domains: license.allowed_domains 
  });
}