# 💬 Easy Chat

![NPM Version](https://img.shields.io/npm/v/@ejunior95/easy-chat?style=flat-square&color=blue)
![License](https://img.shields.io/npm/l/@ejunior95/easy-chat?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat-square&logo=typescript)

**The secure, plug-and-play AI Chat Widget for React.**

Add a ChatGPT-powered assistant to your application in seconds, without exposing your API Keys.

## ✨ Features

- 🚀 **Plug & Play:** Simple React component, easy to install.
- 🔒 **Security First:** Built-in support for Proxy/Backend architecture (hide your OpenAI API Key).
- 📱 **Fully Responsive:** optimizing UX for mobile devices (Full-screen mode).
- 🎨 **Customizable:** Control colors, positions, titles, and initial messages.
- 🧠 **Smart Context:** Define your bot's personality with custom `systemPrompts`.
- 🛡️ **Spam Protection:** (If using the companion proxy) Built-in validation against spam and nonsense inputs.
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
  return (
    <div className="App">
      <h1>My Awesome App</h1>
      
      <EasyChat 
        config={{
          title: "AI Support",
          position: "bottom-right",
          primaryColor: "#007bff",
          systemPrompt: "You are a helpful and sarcastic assistant.",
          api: {
            useProxy: true,
            // Your secure backend URL (Recommended for Production)
            proxyUrl: "[https://your-proxy-url.vercel.app/api](https://your-proxy-url.vercel.app/api)" 
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
| `primaryColor` | `string` | `'#007bff'` | Hex code for the main color (button and user bubbles). |
| `initialMessage` | `string` | `'Olá! ...'` | The first message sent by the bot. |
| `systemPrompt` | `string` | `'You are...'` | Defines the AI's behavior and personality. |
| `api` | `object` | `{}` | Configuration for the connection (see below). |

#### API Configuration (`config.api`)

| Property | Type | Description |
| :--- | :--- | :--- |
| `useProxy` | `boolean` | Set `true` to use your secure backend (Recommended). |
| `proxyUrl` | `string` | The URL of your proxy server (if `useProxy` is true). |
| `apiKey` | `string` | Your OpenAI API Key. **(Use only for local testing. Do not use in production).** |

## 🔒 Architecture & Security

Unlike other libraries that force you to expose your `OPENAI_API_KEY` on the frontend (which is dangerous), **Easy Chat** is designed to work with a simple Proxy Server.

**How to set up the Proxy?**
You can create a simple Vercel Function or Node.js server to act as a middleman.

**Request Format expected by Easy Chat:**

```json
POST /your-proxy-endpoint
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

## 📱 Mobile Behavior

On mobile devices, **Easy Chat** automatically transforms into a full-screen experience for better accessibility and usability. It also includes smooth entry/exit animations

## 📄 License
This is an open-source project and license [Licença MIT](LICENSE).