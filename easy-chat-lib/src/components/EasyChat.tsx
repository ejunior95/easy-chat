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
  language?: 'en' | 'pt';
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

const OFFICIAL_PROXY_URL = 'https://easy-chat-rho.vercel.app/';

const EasyChat: React.FC<EasyChatProps> = ({ config }) => {
  const {
    position = 'bottom-right',
    title = 'EasyChat',
    primaryColor = '#007bff',
    initialMessage = 'Olá, visitante! Como posso ser útil?',
    systemPrompt = 'Você é um assistente útil.',
    theme = 'system',
    language = 'pt',
    apiKey,
    licenseKey,
    onHistoryChange,
    api,
  }: EasyChatConfig = config || {};

  // Internal-only secret flag: not exported in the public `EasyChatConfig`.
  const _internalConfig = config as EasyChatConfig & { isPlayground?: boolean };
  const isPlayground = _internalConfig?.isPlayground ?? false;

  const MAX_CHARS = 100;
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

// 1. Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, viewportHeight]);

  // Bloquear scroll da página de fundo (Body Scroll Lock)
  useEffect(() => {
    if (isOpen) {
      // Salva o estilo original
      const originalStyle = window.getComputedStyle(document.body).overflow;
      // Bloqueia scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restaura scroll ao fechar
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Ajuste de altura para Teclado Mobile (Visual Viewport API)
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      // Aplicando lógica especial se for mobile
      if (window.innerWidth <= 480 && window.visualViewport) {
        // Define a altura como a altura visível real (descontando o teclado)
        setViewportHeight(window.visualViewport.height);
        
        // Garante que o input fique visível rolando para ele
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      } else {
        setViewportHeight(undefined);
      }
    };

    // Ouve redimensionamento
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      handleResize();
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isOpen]);

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


  const validateConfig = (): { isValid: boolean; error?: string; targetUrl?: string } => {
    const hasPaidKeys = !!apiKey && !!licenseKey;
    const hasCustomProxy = !!api?.proxyUrl;

    if (hasPaidKeys && hasCustomProxy) {
      return { 
        isValid: false, 
        error: language === 'pt' 
          ? 'Erro de Configuração: Conflito detectado. Você forneceu chaves de licença E uma URL de proxy personalizada. Use apenas um dos métodos.' 
          : 'Config Error: Conflict detected. You provided license keys AND a custom proxy URL. Please use only one method.'
      };
    }

    if (!hasPaidKeys && !hasCustomProxy) {
      if (apiKey && !licenseKey) return { isValid: true, targetUrl: undefined };

      return { 
        isValid: false, 
        error: language === 'pt' 
          ? 'Erro de Configuração: Nenhuma conexão válida. Forneça suas chaves de acesso (EasyChat PRO) OU configure seu proxy próprio.' 
          : 'Config Error: No valid connection. Provide your access keys (EasyChat PRO) OR configure your custom proxy.'
      };
    }

    if (hasPaidKeys) {
      return { isValid: true, targetUrl: OFFICIAL_PROXY_URL };
    }

    if (hasCustomProxy) {
      return { isValid: true, targetUrl: api!.proxyUrl };
    }

    return { isValid: false, error: 'Erro desconhecido.' };
  };

  const handleSend = async () => {
    if (isPlayground) return;
    if (!input.trim() || isLoading) return;

    const validation = validateConfig();

    if (!validation.isValid) {
      setMessages(prev => [...prev, { role: 'user', content: input }]);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'system', content: `🚫 ${validation.error}` }]);
      }, 200);
      setInput('');
      return;
    }

    const userText = input;
    setInput('');
    setIsLoading(true);

    const newHistory: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);

    try {
      let botResponse = '';
      const targetUrl = validation.targetUrl;
      
      // Se o alvo for OpenAI direto
      // if (targetUrl === 'openai') {
      //   throw new Error("Chamada direta à OpenAI desativada. Use Proxy.");
      // } 

      if (targetUrl) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (apiKey) headers['x-custom-api-key'] = apiKey;
        if (licenseKey) headers['x-license-key'] = licenseKey;

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: headers,
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

  // Estilo dinâmico para corrigir altura no mobile quando teclado abre
  const windowStyle: React.CSSProperties = viewportHeight 
    ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px`, bottom: 0, borderRadius: 0 } 
    : {};

  const themeClass = getThemeClass();

  return (
    <div className={`ec-container ec-${position} ${themeClass}`} style={customStyle}>

      {/* Janela do chat */}
      {(isOpen || isClosing) && (
        <div 
          className={`ec-window ${isClosing ? 'ec-closing' : ''}`} 
          ref={chatWindowRef}
          style={windowStyle}
        >

          <div className="ec-header">
            <span>{title}</span>
            <button
              onClick={closeChat}
              className="ec-close-btn"
              aria-label={language === 'pt' ? 'Fechar chat' : 'Close chat'}
            >
              x
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

            {isLoading && <div className="ec-message ec-message-assistant">{language === 'pt' ? 'Digitando...' : 'Typing...'}</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="ec-footer">
            <div className="ec-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                placeholder={language === 'pt' ? 'Digite aqui sua pergunta...' : 'Type your question here...'}
                value={input}
                maxLength={MAX_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isPlayground) handleSend(); }}
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim() || isPlayground}>
                ➤
              </button>
            </div>

            {/* O Contador */}
            <div className={`ec-char-counter ${getCounterClass()}`}>
              {input.length}/{MAX_CHARS} {language === 'pt' ? 'caracteres' : 'characters'}
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