import type { VercelRequest, VercelResponse } from '@vercel/node';

const allowedOrigins = [
  'https://easychat.ia.br',
  'https://www.easychat.ia.br',
  'https://easychat-landing-page.vercel.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000'                  
];

export function runCorsMiddleware(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-license-key, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}