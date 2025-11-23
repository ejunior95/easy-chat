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
          position: 'bottom-right',
          title: 'EasyChat',
          primaryColor: '#007bff',
          initialMessage: 'Olá, visitante! Como posso ser útil?',
          systemPrompt: 'Você é um assistente útil.',
          theme: 'system',
          api: {
            useProxy: true,
            proxyUrl: ''
          }
        }}
      />
    </div>
  );
}

export default App;