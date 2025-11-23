import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './EasyChat.css';

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
  theme?: 'light' | 'dark' | 'system';
  apiKey?: string;
  licenseKey?: string;
  onHistoryChange?: (messages: Message[]) => void;
  api?: {
    useProxy?: boolean;
    proxyUrl?: string;
  };
}

interface EasyChatProps {
  config?: EasyChatConfig;
}

const DEFAULT_PROXY_URL = 'https://easy-chat-brown.vercel.app/api';

const EasyChat: React.FC<EasyChatProps> = ({ config }) => {
  const {
    position = 'bottom-right',
    title = 'EasyChat',
    primaryColor = '#007bff',
    initialMessage = 'Olá, visitante! Como posso ser útil?',
    systemPrompt = 'Você é um assistente útil.',
    theme = 'system',
    apiKey,
    licenseKey,
    onHistoryChange,
    api = {
      useProxy: true,
      proxyUrl: 'https://easy-chat-brown.vercel.app/api'
    }
  }: EasyChatConfig = config || {};

  const MAX_CHARS = 100;
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (onHistoryChange) {
      onHistoryChange(messages);
    }
  }, [messages, onHistoryChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.ec-launcher')) {
          closeChat();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getThemeClass = () => {
    if (theme === 'dark') return 'ec-theme-dark';
    if (theme === 'light') return '';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'ec-theme-dark';
    }
    return '';
  };

  const openChat = () => {
    setIsOpen(true);
    setIsClosing(false);
  };

  const closeChat = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
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

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (apiKey) {
          headers['x-custom-api-key'] = apiKey;
        }

        if (licenseKey) {
          headers['x-license-key'] = licenseKey;
        }
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

      } else if (apiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
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
        throw new Error('Configuração de API inválida. Forneça uma Licença ou API Key.');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || 'Erro ao conectar.';
      setMessages(prev => [...prev, { role: 'system', content: `⚠️ ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Função auxiliar para classe do contador
  const getCounterClass = () => {
    if (input.length >= MAX_CHARS) return 'ec-limit-reached';
    if (input.length >= MAX_CHARS * 0.9) return 'ec-limit-near';
    return '';
  };

  const customStyle = { '--ec-primary-color': primaryColor } as React.CSSProperties;
  const themeClass = getThemeClass();

  return (
    <div className={`ec-container ec-${position} ${themeClass}`} style={customStyle}>

      {/* Janela do chat */}
      {(isOpen || isClosing) && (
        <div className={`ec-window ${isClosing ? 'ec-closing' : ''}`} ref={chatWindowRef}>

          <div className="ec-header">
            <span>{title}</span>
            <button
              onClick={closeChat}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}
              aria-label="Fechar chat"
            >
              X
            </button>
          </div>

          <div className="ec-messages">
            {messages.map((msg, idx) => (
              msg.role !== 'system' && (
                <div key={idx} className={`ec-message ec-message-${msg.role}`}>

                  {msg.role === 'assistant' ? (
                    <div className="ec-markdown">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}

                </div>
              )
            ))}
            {messages.filter(m => m.role === 'system').map((msg, idx) => (
              <div key={`sys-${idx}`} className="ec-message ec-message-error" style={{fontSize: '0.8rem', color: 'red', textAlign: 'center'}}>
                {msg.content}
              </div>
            ))}

            {isLoading && <div className="ec-message ec-message-assistant">Digitando...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="ec-footer">
            <div className="ec-input-wrapper">
              <input
                type="text"
                placeholder="Digite aqui sua pergunta..."
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                ➤
              </button>
            </div>

            {/* O Contador */}
            <div className={`ec-char-counter ${getCounterClass()}`}>
              {input.length}/{MAX_CHARS} caracteres
            </div>
          </div>
        </div>
      )}

      {/* Botão flutuante*/}
      {!isOpen && !isClosing && (
        <button className="ec-launcher" onClick={openChat}>
          <span>💬</span>
        </button>
      )}
    </div>
  );
};

export default EasyChat;