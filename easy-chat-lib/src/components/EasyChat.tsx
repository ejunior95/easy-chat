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

// Constantes globais evitam recriação na renderização
const OFFICIAL_PROXY_URL = 'https://easy-chat-rho.vercel.app/';
const MAX_CHARS = 100;

const EasyChat: React.FC<EasyChatProps> = ({ config }) => {
  // --- CONFIGURAÇÃO E DEFAULTS ---
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

  // Flag interna para desenvolvimento (não documentada)
  const _internalConfig = config as EasyChatConfig & { isPlayground?: boolean };
  const isPlayground = _internalConfig?.isPlayground ?? false;

  // --- ESTADOS (STATE) ---
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para controlar altura no mobile (teclado virtual)
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage }
  ]);

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- EFEITOS (EFFECTS) ---

  // 1. Scroll Automático (Unificado)
  // Rola para baixo sempre que mensagens mudam, chat abre ou teclado mobile aparece
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, viewportHeight]);

  // 2. Bloqueio de Scroll do Body (UX)
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalStyle; };
    }
  }, [isOpen]);

  // 3. Monitoramento da History (Callback externo)
  useEffect(() => {
    if (onHistoryChange) onHistoryChange(messages);
  }, [messages, onHistoryChange]);

  // 4. Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Ignora se o clique for no botão de abrir (launcher)
        if (!target.closest('.ec-launcher')) {
          closeChat();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 5. Ajuste Mobile (Visual Viewport API)
  // Lógica complexa para garantir que o chat não fique escondido atrás do teclado iOS/Android
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (window.innerWidth <= 480 && window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        // Pequeno delay para garantir que o layout atualizou antes do scroll
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
      handleResize(); // Chamada inicial
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

  // --- LÓGICA AUXILIAR ---

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
      // Permite uso direto da OpenAI se tiver apenas API Key (modo dev/inseguro)
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

  // --- LÓGICA DE API (Fetch) ---
  // Extraído para limpar o handleSend
  const fetchChatResponse = async (history: Message[], targetUrl?: string): Promise<string> => {
    // 1. Caso Proxy (Oficial ou Custom)
    if (targetUrl) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-custom-api-key'] = apiKey;
      if (licenseKey) headers['x-license-key'] = licenseKey;

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: history.filter(m => m.role !== 'system'), // Filtra erros de sistema
          systemPrompt
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no servidor');
      return data.content;
    } 
    
    // 2. Caso OpenAI Direto (Client-side - Cuidado: expõe a chave)
    else if (apiKey) {
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

  // --- HANDLERS (Ações do Usuário) ---

  const openChat = () => { setIsOpen(true); setIsClosing(false); };
  
  const closeChat = () => {
    setIsClosing(true);
    setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 300); // 300ms = tempo da animação CSS
  };

  const handleSend = async () => {
    if (isPlayground || !input.trim() || isLoading) return;

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

  // --- RENDER HELPERS ---
  const getCounterClass = () => {
    if (input.length >= MAX_CHARS) return 'ec-limit-reached';
    if (input.length >= MAX_CHARS * 0.9) return 'ec-limit-near';
    return '';
  };

  const customStyle = { '--ec-primary-color': primaryColor } as React.CSSProperties;
  
  // Aplica a altura do viewport apenas se estiver definido (mobile com teclado)
  const windowStyle: React.CSSProperties = viewportHeight 
    ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px`, bottom: 0, borderRadius: 0 } 
    : {};

  const themeClass = getThemeClass();

  // --- RENDERIZAÇÃO ---
  return (
    <div className={`ec-container ec-${position} ${themeClass}`} style={customStyle}>

      {/* Janela Principal */}
      {(isOpen || isClosing) && (
        <div 
          className={`ec-window ${isClosing ? 'ec-closing' : ''}`} 
          ref={chatWindowRef}
          style={windowStyle}
        >
          {/* Cabeçalho */}
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

          {/* Área de Mensagens */}
          <div className="ec-messages">
            {messages.map((msg, idx) => (
              msg.role !== 'system' && (
                <div key={idx} className={`ec-message ec-message-${msg.role}`}>
                  {msg.role === 'assistant' ? (
                    <div className="ec-markdown">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    /* Mensagens do usuário são renderizadas como texto puro para segurança */
                    msg.content
                  )}
                </div>
              )
            ))}
            
            {/* Mensagens de Erro/Sistema */}
            {messages.filter(m => m.role === 'system').map((msg, idx) => (
              <div key={`sys-${idx}`} className="ec-message ec-message-error">
                {msg.content}
              </div>
            ))}

            {isLoading && <div className="ec-message ec-message-assistant">{language === 'pt' ? 'Digitando...' : 'Typing...'}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Rodapé (Input) */}
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
            <div className={`ec-char-counter ${getCounterClass()}`}>
              {input.length}/{MAX_CHARS} {language === 'pt' ? 'caracteres' : 'characters'}
            </div>
          </div>
        </div>
      )}

      {/* Botão Flutuante (Launcher) */}
      {!isOpen && !isClosing && (
        <button className="ec-launcher" onClick={openChat}>
          <span>💬</span>
        </button>
      )}
    </div>
  );
};

export default EasyChat;