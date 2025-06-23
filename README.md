# AI Voice Complaint Agent

A modern AI-powered voice agent for handling service complaints with a beautiful mobile-first interface.

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root and add the following environment variables:

\`\`\`env
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Webhook URL for complaint data
WEBHOOK_URL=https://your-webhook-endpoint.com/complaints

# Optional: Webhook authentication token
WEBHOOK_TOKEN=your_webhook_auth_token
\`\`\`

### 2. Getting Your Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new API key or use an existing one
5. Copy the API key and add it to your `.env.local` file

### 3. Setting Up Your Webhook

Replace `WEBHOOK_URL` with your actual webhook endpoint that will receive the complaint data.

The webhook will receive POST requests with this structure:
\`\`\`json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "conversationLength": 6,
  "customerMessages": [...],
  "fullConversation": [...],
  "source": "ai_voice_agent"
}
\`\`\`

### 4. Running the Application

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Features

- 🎤 **Voice Recognition**: Real-time speech-to-text conversion
- 🤖 **AI Conversation**: Powered by Google Gemini for natural conversations  
- 🔊 **Text-to-Speech**: AI responses are spoken back to users
- 📱 **Mobile-First Design**: Beautiful, modern interface optimized for mobile
- 🔗 **Webhook Integration**: Automatic complaint data submission
- 🎨 **Glassmorphism UI**: Modern design with gradient backgrounds

## Browser Compatibility

- Chrome/Edge: Full support for voice features
- Firefox: Limited voice support
- Safari: Basic functionality (voice features may be limited)

For the best experience, use Chrome or Edge browsers.
