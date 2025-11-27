import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './EasyChat.css';

// --- TIPAGEM ---
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
const MAX_CHARS = 100;

// --- FUNÇÃO AUXILIAR DE CONTRASTE (NOVO) ---
// Calcula se o texto deve ser preto ou branco baseado na cor de fundo (YIQ)
const getContrastingTextColor = (hexColor: string): string => {
  // Remove o # se existir
  const hex = hexColor.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calcula a luminância (fórmula YIQ padrão)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Se for claro (>= 128), retorna preto. Senão, branco.
  return yiq >= 128 ? '#000000' : '#ffffff';
};

const EasyChat: React.FC<EasyChatProps> = ({ config }) => {
  // --- CONFIGURAÇÃO ---
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

  const _internalConfig = config as EasyChatConfig & { isPlayground?: boolean };
  const isPlayground = _internalConfig?.isPlayground ?? false;

  // --- ESTADOS ---
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ]);

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const titleId = 'easy-chat-title';

  // --- EFEITOS (LÓGICA) ---

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, viewportHeight]);

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalStyle; };
    }
  }, [isOpen]);

  useEffect(() => {
    if (onHistoryChange) onHistoryChange(messages);
  }, [messages, onHistoryChange]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      if (window.innerWidth <= 480 && window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      } else {
        setViewportHeight(undefined);
      }
    };
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

  // --- ACESSIBILIDADE & UX ---
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (!isOpen && !isClosing) {
      setTimeout(() => launcherRef.current?.focus(), 0);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') closeChat();

      if (e.key === 'Tab' && chatWindowRef.current) {
        const focusableElements = chatWindowRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) { 
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { 
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);


  // --- FUNÇÕES AUXILIARES ---

  const getThemeClass = () => {
    if (theme === 'dark') return 'ec-theme-dark';
    if (theme === 'light') return '';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'ec-theme-dark';
    }
    return '';
  };

  const validateConfig = (): { isValid: boolean; error?: string; targetUrl?: string } => {
    const hasPaidKeys = !!apiKey && !!licenseKey;
    const hasCustomProxy = !!api?.proxyUrl;

    if (hasPaidKeys && hasCustomProxy) {
      return { 
        isValid: false, 
        error: language === 'pt' 
          ? 'Erro: Conflito. Use apenas chaves de licença OU URL de proxy.' 
          : 'Error: Conflict. Use only license keys OR proxy URL.'
      };
    }
    if (!hasPaidKeys && !hasCustomProxy) {
      if (apiKey && !licenseKey) return { isValid: true, targetUrl: undefined }; 
      return { 
        isValid: false, 
        error: language === 'pt' 
          ? 'Erro: Nenhuma conexão válida (Faltam chaves ou Proxy).' 
          : 'Error: No valid connection (Missing keys or Proxy).'
      };
    }
    const targetUrl = hasPaidKeys ? OFFICIAL_PROXY_URL : api!.proxyUrl;
    return { isValid: true, targetUrl };
  };

  const fetchChatResponse = async (history: Message[], targetUrl?: string): Promise<string> => {
    if (targetUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-custom-api-key'] = apiKey;
      if (licenseKey) headers['x-license-key'] = licenseKey;

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: history.filter(m => m.role !== 'system'),
          systemPrompt
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no servidor');
      return data.content;
    } else if (apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: systemPrompt }, ...history]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro na OpenAI');
      return data.choices[0].message.content;
    }
    throw new Error('Configuração inválida.');
  };

  // --- HANDLERS ---

  const openChat = () => { setIsOpen(true); setIsClosing(false); };
  
  const closeChat = () => {
    setIsClosing(true);
    setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 300);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // --- PLAYGROUND LOGIC ---
    if (isPlayground) {
        const userText = input;
        setInput('');
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: userText }]);

        setTimeout(() => {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: language === 'pt' 
                    ? "✨ **Modo Demonstração:** Olá! No site oficial do EasyChat, eu simulo uma resposta para você ver como sou bonito e rápido. Em sua aplicação real, aqui apareceria a resposta da Inteligência Artificial."
                    : "✨ **Demo Mode:** Hello! On the EasyChat website, I simulate a response so you can see how fast and pretty I am. In your real app, the AI response would appear here."
            }]);
            setIsLoading(false);
        }, 1500);
        return; 
    }

    const validation = validateConfig();

    if (!validation.isValid) {
      setMessages(prev => [...prev, { role: 'user', content: input }]);
      setTimeout(() => setMessages(prev => [...prev, { role: 'system', content: `🚫 ${validation.error}` }]), 200);
      setInput('');
      return;
    }

    const userText = input;
    setInput('');
    setIsLoading(true);

    const newHistory: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);

    try {
      const botResponse = await fetchChatResponse(newHistory, validation.targetUrl);
      setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
    } catch (error: any) {
      console.error('EasyChat Error:', error);
      const errorMessage = error.message || 'Erro ao conectar.';
      setMessages(prev => [...prev, { role: 'system', content: `⚠️ ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCounterClass = () => {
    if (input.length >= MAX_CHARS) return 'ec-limit-reached';
    if (input.length >= MAX_CHARS * 0.9) return 'ec-limit-near';
    return '';
  };

  // --- ESTILOS DINÂMICOS ---
  // Calculamos a cor do texto (preto ou branco) baseada na cor primária
  const contrastingTextColor = getContrastingTextColor(primaryColor);

  const customStyle = { 
    '--ec-primary-color': primaryColor,
    '--ec-primary-text-color': contrastingTextColor, // Nova variável CSS
  } as React.CSSProperties;

  const windowStyle: React.CSSProperties = viewportHeight 
    ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px`, bottom: 0, borderRadius: 0 } 
    : {};
  const themeClass = getThemeClass();

  // --- RENDER ---
  return (
    <div className={`ec-container ec-${position} ${themeClass}`} style={customStyle}>

      {(isOpen || isClosing) && (
        <div 
          className={`ec-window ${isClosing ? 'ec-closing' : ''}`} 
          ref={chatWindowRef}
          style={windowStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="ec-header">
            <span id={titleId}>{title}</span>
            <button
              onClick={closeChat}
              className="ec-close-btn"
              aria-label={language === 'pt' ? 'Fechar chat' : 'Close chat'}
              title={language === 'pt' ? 'Fechar' : 'Close'}
            >
              {/* Ícone SVG de Fechar mais bonito */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="ec-messages" role="log" aria-live="polite" aria-atomic="false">
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
              <div key={`sys-${idx}`} className="ec-message ec-message-error" role="alert">
                {msg.content}
              </div>
            ))}

            {isLoading && (
              <div className="ec-message ec-message-assistant" aria-label={language === 'pt' ? 'Digitando...' : 'Typing...'}>
                <span aria-hidden="true">{language === 'pt' ? 'Digitando...' : 'Typing...'}</span>
              </div>
            )}
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                disabled={isLoading}
                aria-label={language === 'pt' ? 'Mensagem para o assistente' : 'Message to assistant'}
              />
              <button 
                className="ec-send-btn"
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                aria-label={language === 'pt' ? 'Enviar mensagem' : 'Send message'}
              >
                 ➤
              </button>
            </div>
            <div className={`ec-char-counter ${getCounterClass()}`} aria-hidden="true">
              <span>{input.length}/{MAX_CHARS} {language === 'pt' ? 'caracteres' : 'characters'}</span>
              <span>Powered by EasyChat 💬</span>
            </div>
          </div>
        </div>
      )}

      {!isOpen && !isClosing && (
        <button 
          ref={launcherRef}
          className="ec-launcher" 
          onClick={openChat}
          aria-label={language === 'pt' ? 'Abrir chat' : 'Open chat'}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span aria-hidden="true">💬</span>
        </button>
      )}
    </div>
  );
};

export default EasyChat;