import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Count user messages to determine conversation step
  const userMessages = messages.filter((m: any) => m.role === "user")
  const userMessageCount = userMessages.length

  let systemPrompt = ""

  if (userMessageCount === 0) {
    // Initial welcome
    systemPrompt = `You are AURA. Say EXACTLY: "Hello there! Welcome to our customer service. My name is AURA, your virtual assistant. How are you doing today, and how can I assist you?"`
  } else if (userMessageCount === 1) {
    // After first complaint - MUST show empathy
    systemPrompt = `You are AURA. The customer just shared their complaint. You MUST respond with empathy and acknowledgment. 

Say something like: "I completely understand how frustrating this must be for you. Having trouble accessing your dashboard and account is really concerning. Let me make sure I understand - you can't log in, your balance isn't showing, and nothing on your dashboard is working, is that correct? When did this issue first start happening?"

CRITICAL: You MUST ask "When did this first start happening?" or "How long has this been going on?" to move to the next step.`
  } else if (userMessageCount === 2) {
    // After empathy - collect more details
    systemPrompt = `You are AURA. You've shown empathy. Now collect more specific details about their issue.

Ask questions like: "Thank you for that information. Can you tell me what type of account this is - is this a personal or business account?" or "What device are you using when you try to access your dashboard?" or "Are you getting any specific error messages when you try to log in?"

Keep it short and ask ONE specific question.`
  } else if (userMessageCount === 3) {
    // After details - provide reassurance and ask for email
    systemPrompt = `You are AURA. You've gathered the complaint details. Now provide reassurance and ask for email.

Say EXACTLY: "I want you to know that our team takes this very seriously. We will investigate this issue immediately and work to resolve it. Your complaint is important to us and will be prioritized. I'm going to ask you to submit your email address now so our team can follow up with you directly about the resolution."

CRITICAL: You MUST say "submit your email address" to trigger the email popup.`
  } else {
    // Fallback
    systemPrompt = `You are AURA. Continue the conversation naturally and ask for their email if you haven't already. Say "I need you to submit your email address" to trigger the email collection.`
  }

  const result = await streamText({
    model: google("gemini-1.5-pro"),
    system: systemPrompt,
    messages,
    maxTokens: 100,
  })

  return result.toDataStreamResponse()
}
