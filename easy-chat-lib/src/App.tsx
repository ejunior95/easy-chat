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
          title: "Assistente Lume",
          position: "bottom-right",
          systemPrompt: "Seu nome é Lume e é um assistente útil e amigável de uma loja de materiais de construção BoaCasa.",
        }} 
      />
    </div>
  );
}

export default App;