import React, { useState, useRef, useEffect } from 'react';
import './EasyChat.css';

// --- Interfaces (Iguais ao anterior) ---
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EasyChatConfig {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  title?: string;
  primaryColor?: string;
  initialMessage?: string;
  systemPrompt?: string;
  api?: {
    useProxy?: boolean;
    proxyUrl?: string;
    apiKey?: string;
  };
}

interface EasyChatProps {
  config?: EasyChatConfig;
}

// --- Componente ---

const EasyChat: React.FC<EasyChatProps> = ({ config }) => {
  const {
    position = 'bottom-right',
    title = 'Chat Suporte',
    primaryColor = '#007bff',
    initialMessage = 'Olá! Como posso ajudar?',
    systemPrompt = 'Você é um assistente útil.',
    api = { 
      useProxy: true, 
      proxyUrl: 'https://easy-chat-brown.vercel.app/api' 
    }
  } = config || {};

  // Estados
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false); // NOVO: Controla animação de saída
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // --- NOVO: Função para abrir ---
  const openChat = () => {
    setIsOpen(true);
    setIsClosing(false);
  };

  // --- NOVO: Função para fechar com animação ---
  const closeChat = () => {
    setIsClosing(true); // 1. Ativa classe CSS de saída
    setTimeout(() => {
      setIsOpen(false); // 2. Remove do DOM após 300ms
      setIsClosing(false);
    }, 300); // Deve bater com o tempo do CSS (--ec-anim-duration)
  };

  // Função de alternar (para o botão)
  const toggleChat = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    setIsLoading(true);

    const newHistory: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);

    try {
      let botResponse = '';

      if (api.useProxy && api.proxyUrl) {
        const res = await fetch(api.proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newHistory.filter(m => m.role !== 'system'),
            systemPrompt: systemPrompt
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro no servidor');
        botResponse = data.content;

      } else if (api.apiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: systemPrompt }, ...newHistory]
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Erro na OpenAI');
        botResponse = data.choices[0].message.content;
      } else {
        throw new Error('Configuração de API inválida.');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', content: 'Erro ao conectar.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const customStyle = { '--ec-primary-color': primaryColor } as React.CSSProperties;

  return (
    <div className={`ec-container ec-${position}`} style={customStyle}>
      
      {/* A Janela só é renderizada se isOpen for true OU se estiver fechando (para mostrar animação final) */}
      {(isOpen || isClosing) && (
        // Adicionamos a classe 'ec-closing' se o estado for true
        <div className={`ec-window ${isClosing ? 'ec-closing' : ''}`}>
          
          <div className="ec-header">
            <span>{title}</span>
            <button 
              onClick={closeChat} 
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}
              aria-label="Fechar chat"
            >
              ✕
            </button>
          </div>

          <div className="ec-messages">
            {messages.map((msg, idx) => (
              msg.role !== 'system' && (
                <div key={idx} className={`ec-message ec-message-${msg.role}`}>
                  {msg.content}
                </div>
              )
            ))}
            {messages.filter(m => m.role === 'system').map((msg, idx) => (
               <div key={`sys-${idx}`} className="ec-message ec-message-error">{msg.content}</div>
            ))}
            
            {isLoading && <div className="ec-message ec-message-assistant">Digitando...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="ec-input-area">
            <input 
              type="text" 
              placeholder="Digite..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Botão Redondo: Só aparece se a janela NÃO estiver aberta (e nem fechando) */}
      {!isOpen && !isClosing && (
        <button className="ec-launcher" onClick={openChat}>
          <span>💬</span>
        </button>
      )}
    </div>
  );
};

export default EasyChat;