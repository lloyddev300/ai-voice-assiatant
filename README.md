# AI Voice Complaint Agent

A modern AI-powered voice agent for handling service complaints with a beautiful mobile-first interface.

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in your project root and add the following environment variable:

\`\`\`env
# Google Gemini API Key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
\`\`\`

### 2. Getting Your Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" 
4. Create a new API key or use an existing one
5. Copy the API key and add it to your `.env.local` file

### 3. Webhook Integration

The application is configured to send complaint data to Make.com:
- **Webhook URL**: `https://hook.eu2.make.com/nt3ksn919sac480tcliv0an9gtemlej1`
- All complaint conversations are automatically sent to this endpoint
- No additional configuration required

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
- 🔗 **Make.com Integration**: Automatic complaint data submission to Make.com
- 🎨 **Glassmorphism UI**: Modern design with gradient backgrounds
- 📊 **Conversation Tracking**: 5-step conversation flow with progress tracking

## Conversation Flow

1. **Welcome**: AURA greets the customer
2. **Complaint Capture**: Customer explains their issue
3. **Empathy & Acknowledgment**: AURA shows understanding and asks for details
4. **Details Collection**: AURA asks specific questions about the issue
5. **Email Collection**: Customer provides email for follow-up

## Webhook Payload

The following data is sent to Make.com for each completed conversation:

\`\`\`json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "conversationLength": 6,
  "customerMessages": [...],
  "fullConversation": [...],
  "complaintData": {
    "complaint": "Main complaint text",
    "issueDetails": "Additional details",
    "customerInfo": "Customer information",
    "conversationHistory": [...]
  },
  "customerEmail": "customer@example.com",
  "conversationStep": 5,
  "summary": {...},
  "source": "ai_voice_agent"
}
\`\`\`

## Browser Compatibility

- Chrome/Edge: Full support for voice features
- Firefox: Limited voice support
- Safari: Basic functionality (voice features may be limited)

For the best experience, use Chrome or Edge browsers.
