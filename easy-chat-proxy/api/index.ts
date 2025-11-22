import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

interface ChatRequestBody {
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  systemPrompt?: string;
}

// --- Validação ---
function isValidContent(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();

  // 1. Regra de tamanho mínimo
  if (trimmed.length < 1) return false; 

  // 2. Regra de SÓ Números
  const isOnlyNumbers = /^\d+$/.test(trimmed);
  if (isOnlyNumbers && trimmed.length > 6) return false;

  // 3. Regra de Caracteres Repetidos
  if (/(.)\1{15,}/.test(trimmed)) return false;
  
  // 4. Regra de Spam Comum
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

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'Server: OPENAI_API_KEY is not defined.' });
    }

    const { messages, systemPrompt } = request.body as ChatRequestBody;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return response.status(400).json({ error: 'Chat history invalid: request body must have an array' });
    }

    const lastMessage = messages[messages.length - 1];
    const refusalMessage = "Desculpe, mas sua mensagem não é válida (detectamos spam ou caracteres aleatórios). Tente novamente com uma frase coerente, por favor.";

    // Valida o conteúdo do usuário
    if (lastMessage.role === 'user' && !isValidContent(String(lastMessage.content || ''))) {
      return response.status(200).json({ content: refusalMessage });
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