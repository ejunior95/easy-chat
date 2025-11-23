# 💬 Easy Chat

![NPM Version](https://img.shields.io/npm/v/@ejunior95/easy-chat?style=flat-square&color=blue)
![License](https://img.shields.io/npm/l/@ejunior95/easy-chat?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square&logo=typescript)

**The secure, plug-and-play AI Chat Widget for React.**

Add a ChatGPT-powered assistant to your application in seconds, without exposing your API Keys.

## ✨ Features

- 🚀 **Plug & Play:** Simple React component, easy to install.
- 📝 **Markdown Support:** Bot responses are rendered with Markdown (code blocks, bold, lists, etc).
- 🌍 **Multi-language:** Built-in support for Portuguese (pt) and English (en).
- 🌗 **Themeable:** Built-in Dark, Light, and System modes.
- 🔒 **Security First:** Built-in support for Proxy/Backend architecture (hide your OpenAI API Key).
- 📱 **Fully Responsive:** Mobile-optimized UX with full-screen mode and smooth animations.
- 🧠 **Smart Context:** Define your bot's personality with custom systemPrompts.
- 💾 **History Tracking:** Access the chat history in real-time via callback.
- 🛡️ **Spam Protection & Rate Limiting:** (If using the companion proxy) Built-in validation against spam and abusive usage.
- 🟦 **Type-Safe:** Written in TypeScript with full type definitions.

---

## 📦 Installation

```bash
npm install @ejunior95/easy-chat
```

## 🚀 Quick Start
1. Import the component and the **CSS styles.**

2. Pass your configuration.

```typescript
import React from 'react';
import { EasyChat } from '@ejunior95/easy-chat';
import '@ejunior95/easy-chat/dist/style.css'; // ⚠️ Don't forget the CSS!

function App() {
  const handleHistoryChange = (messages) => {
    console.log("Current Chat History:", messages);
  };

  return (
    <div className="App">
      <h1>My Awesome App</h1>
      
      <EasyChat 
        config={{
          title: "AI Support",
          position: "bottom-right",
          primaryColor: "#007bff",
          theme: "system", // 'light', 'dark' or 'system'
          language: "en",  // 'pt' or 'en'
          systemPrompt: "You are a helpful and sarcastic assistant.",
          onHistoryChange: handleHistoryChange, // Get messages in real-time
          api: {
            useProxy: true,
            // Your secure backend URL (Recommended for Production)
            proxyUrl: "https://your-proxy-url.app/api" 
          }
        }} 
      />
    </div>
  );
}

export default App;
```

## ⚙️ Configuration

The `config` prop accepts an object with the following properties:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | `'Chat Suporte'` | The title displayed in the chat header. |
| `position` | `string` | `'bottom-right'` | Positions: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'`. |
| `theme` | `string` | `system` | Color theme: `light`, `dark`, or `system` (auto-detect). |
| `language` | `en, pt` | `pt` | Interface language (placeholders, loading text). |
| `primaryColor` | `string` | `'#007bff'` | Hex code for the main color (button and user bubbles). |
| `initialMessage` | `string` | `'Olá! ...'` | The first message sent by the bot. |
| `systemPrompt` | `string` | `'You are...'` | Defines the AI's behavior and personality. |
| `apiKey` | `string` | `undefined` | Comming soon. |
| `licenseKey` | `string` | `undefined` | Comming soon. |
| `onHistoryChange` | `function` | `undefined` | Callback function that receives the array of messages `(msgs) => void`. |
| `api` | `object` | `{}` | Configuration for the connection (see below). |

#### API Configuration (`config.api`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `useProxy` | `boolean` | Set `true` to use your secure backend (Recommended). |
| `proxyUrl` | `string` | The URL of your proxy server (if `useProxy` is true). |

## 🔌 Custom Backend Integration

**Easy Chat** is backend-agnostic. You can connect it to any API (Node.js, Python/Django, Go, PHP, etc.) as long as it respects the communication format.

This allows you to:

- Use other AI models (Claude, Gemini, Local Llama, Ollama).

- Add business logic or validations before responding.

- Save chat logs to your own database.

##### 1. Component Configuration
Enable proxy mode and set your API URL:

```typescript
<EasyChat
  config={{
    // ...
    api: {
      useProxy: true,
      proxyUrl: "https://api.yoursite.com/v1/chat" // Your custom API
    },
    // Optional: EasyChat PRO keys
    apiKey: "my-secret-token", 
    licenseKey: "my-license"
  }}
/>
```

##### 2. API Contract (Request/Response)
Your API will receive a `POST` request containing the chat history and system prompt.

**Request (Sent by EasyChat):**

```http
POST /your-endpoint
Content-Type: application/json
x-custom-api-key: "..." (if configured)

{
  "messages": [
    { "role": "assistant", "content": "Hello, how can I help?" },
    { "role": "user", "content": "I want to know the price." }
  ],
  "systemPrompt": "You are a helpful salesman..."
}
```

**Response (Expected from your API):** Your API must return a JSON object with a `content` property containing the text response (Markdown supported).

```json
{
  "content": "The product price is $50.00."
}
```

##### 3. Implementation Example (Node.js/Express)

```typescript
app.post('/api/chat', async (req, res) => {
  const { messages, systemPrompt } = req.body;
  
  // 1. Example: Call another AI or process logic
  const aiResponse = await myAIService.generateResponse(messages, systemPrompt);

  // 2. Return in the format EasyChat expects
  res.json({ 
    content: aiResponse 
  });
}); 
```


## 🎨 Themes & Customization
**Easy Chat** supports Markdown rendering out of the box, meaning code blocks and lists sent by the AI will look great.

Regarding colors, you can force a theme or let the widget respect the user's OS preference:

* `theme: 'light'` - Always light mode.

* `theme: 'dark'` - Always dark mode.

* `theme: 'system'` - Detects `prefers-color-scheme` from the browser.

## 🔒 Architecture & Security

Unlike other libraries that force you to expose your `OPENAI_API_KEY` on the frontend (which is dangerous), **Easy Chat** is designed to work with a simple Proxy Server.

**How to set up the Proxy?** You can create a simple Vercel Function or Node.js server to act as a middleman. The library automatically sends custom headers if you provide keys in the config.

**Request Format expected by Easy Chat:**

```json
POST /your-proxy-endpoint
Headers: 
  Content-Type: application/json
  x-custom-api-key: "..." (if provided in config)
  x-license-key: "..." (if provided in config)

Body:
{
  "messages": [...], // Array of message history
  "systemPrompt": "..." 
}
```

**Response Format:**

```json
{
  "content": "The AI response text..."
}
```

<!-- Proxy Features (Optional)
If you use the provided proxy template, you also get:

MongoDB Logging: Logs token usage, duration, and errors.

Rate Limiting: Prevents spam by limiting requests per IP (default 3s cooldown).

Spam Filter: Rejects messages with repetitive patterns or nonsense. -->

## 📱 Mobile Behavior

On mobile devices, **Easy Chat** automatically transforms into a full-screen experience for better accessibility and usability. It includes smooth entry/exit animations and supports "Click Outside" to close (on desktop).

## 📄 License
This is an open-source project under the [MIT License](LICENSE).