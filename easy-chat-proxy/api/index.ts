import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

interface ChatRequestBody {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  systemPrompt?: string;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {

  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'Server: OPENAI_API_KEY is not defined.' });
    }

    const { messages, systemPrompt } = request.body as ChatRequestBody;

    if (!messages || !Array.isArray(messages)) {
      return response.status(400).json({ error: 'request body must have an array' });
    }

    const defaultSystemPrompt = "Você é um assistente virtual amigável e útil.";
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    const messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: finalSystemPrompt },
      ...messages
    ];

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messagesForOpenAI,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;
    return response.status(200).json({ content: reply });

  } catch (error: any) {
    console.error("Proxy error:", error);
    return response.status(500).json({ error: `Proxy error - ${error}` });
  }
}