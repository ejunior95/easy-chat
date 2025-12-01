import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { runCorsMiddleware } from './cors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(req: VercelRequest, res: VercelResponse) {
// CORS middleware
  const isPreflight = runCorsMiddleware(req, res);
  
  if (isPreflight) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { domain, priceId } = req.body;

  if (!domain || !priceId) {
      return res.status(400).json({ error: "Missing domain or priceId" });
  }
  
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  try {

    const origin = req.headers.origin || 'https://easychat.ia.br';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        target_domain: cleanDomain
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}