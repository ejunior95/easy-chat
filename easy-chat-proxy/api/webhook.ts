import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buffer } from 'micro';
import Stripe from 'stripe';
import crypto from 'crypto';
import { connectToDatabase } from '../configs/database/mongo';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export const config = {
  api: { bodyParser: false }, // Necessário para Webhooks na Vercel
};

function generateLicenseKey() {
  return 'EC-' + crypto.randomBytes(12).toString('hex').toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-license-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Recuperar dados
    const targetDomain = session.metadata?.target_domain;
    const customerEmail = session.customer_details?.email;

    if (targetDomain) {
      const db = await connectToDatabase(process.env.MONGODB_URI as string);
      const newLicenseKey = generateLicenseKey();

      // Inserir Licença
      await db.collection('licenses').insertOne({
        key: newLicenseKey,
        email: customerEmail,
        status: 'active',
        plan: 'pro',
        created_at: new Date(),
        allowed_domains: [targetDomain, 'localhost', '127.0.0.1'],
        stripe_session_id: session.id
      });

      console.log(`Licença gerada para ${customerEmail}: ${newLicenseKey}`);
    }
  }

  res.json({ received: true });
}