import EasyChat from './components/EasyChat';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Teste da Minha Lib: Easy Chat</h1>
      <p>O botão deve aparecer no canto inferior direito.</p>
      <p>Tente conversar com ele!</p>

      {/* Instanciando o chat */}
      <EasyChat
        config={{
          title: "Playground EasyBot 🤖",
          position: "bottom-left",
          primaryColor: "#ff0000ff",
          theme: "light",
          language: 'pt',
          systemPrompt: 'Você é um assistente útil especializado em EasyChat.',
          initialMessage: "Olá! Precisa de ajuda com a EasyChat?",
          // @ts-ignore
          isPlayground: true,
          api: {
            proxyUrl: "https://easy-chat-rho.vercel.app/api",
          }
        }}
      />
      <EasyChat
        config={{
          title: "EasyBot 🤖",
          position: "bottom-right",
          primaryColor: "#0067E2",
          theme: "dark",
          language: 'pt',
          systemPrompt: 'Você é um assistente útil especializado em EasyChat.',
          initialMessage: "Olá! Precisa de ajuda com a EasyChat?",
          api: {
            proxyUrl: "https://easy-chat-rho.vercel.app/api",
          }
        }}
      />
    </div>
  );
}

export default App;