import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { MongoClient, Db } from 'mongodb'; // Importamos o cliente Mongo

let cachedDb: Db | null = null;

async function connectToDatabase(uri: string) {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(uri);
  const db = client.db('easychat_logs');

  cachedDb = db;
  return db;
}

interface ChatRequestBody {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  systemPrompt?: string;
}

// --- Validação ---
function isValidContent(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 1) return false;
  const isOnlyNumbers = /^\d+$/.test(trimmed);
  if (isOnlyNumbers && trimmed.length > 6) return false;
  if (/(.)\1{15,}/.test(trimmed)) return false;
  if (trimmed.length > 30 && !/\s/.test(trimmed)) return false;
  return true;
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

  const apiKey = process.env.OPENAI_API_KEY;
  const mongoUri = process.env.MONGODB_URI;

  if (!apiKey || !mongoUri) {
    console.error("Server config error: Missing API keys");
    return response.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    const userAgent = request.headers['user-agent'] || 'unknown';
    const originUrl = request.headers['referer'] || request.headers['origin'] || 'unknown';

    const { messages, systemPrompt } = request.body as ChatRequestBody;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return response.status(400).json({ error: 'Chat history invalid' });
    }

    const lastMessage = messages[messages.length - 1];
    const userContent = String(lastMessage.content || '');

    if (lastMessage.role === 'user' && !isValidContent(userContent)) {
      return response.status(200).json({
        content: "Desculpe, mas sua mensagem não é válida (detectamos spam ou caracteres aleatórios). Tente novamente."
      });
    }

    const defaultSystemPrompt = "Você é um assistente virtual amigável e útil.";
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    const messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: finalSystemPrompt },
      ...messages
    ];

    const openai = new OpenAI({ apiKey });

    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messagesForOpenAI,
      temperature: 0.7,
    });

    const duration = Date.now() - startTime;
    const reply = completion.choices[0].message.content;
    const usage = completion.usage;

    try {
      const db = await connectToDatabase(mongoUri);

      await db.collection('interactions').insertOne({
        timestamp: new Date(),
        model: 'gpt-3.5-turbo',
        duration_ms: duration,
        prompt_tokens: usage?.prompt_tokens || 0,
        completion_tokens: usage?.completion_tokens || 0,
        total_tokens: usage?.total_tokens || 0,
        client_user_agent: userAgent,
        client_origin: originUrl,
        status: 'success',
      });

    } catch (dbError) {
      console.error("Erro ao salvar log no Mongo:", dbError);
    }

    return response.status(200).json({ content: reply });

  } catch (error: any) {
    console.error("Proxy error:", error);
    try {
      if (process.env.MONGODB_URI) {
        const db = await connectToDatabase(process.env.MONGODB_URI);
        await db.collection('interactions').insertOne({
          timestamp: new Date(),
          status: 'error',
          error_message: error.message
        });
      }
    } catch (e) { }

    return response.status(500).json({ error: `Proxy error - ${error}` });
  }
}