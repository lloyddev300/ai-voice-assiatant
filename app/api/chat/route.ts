import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Count user messages to determine conversation step
  const userMessages = messages.filter((m: any) => m.role === "user")
  const userMessageCount = userMessages.length

  console.log(`Processing message ${userMessageCount + 1}, current user messages:`, userMessageCount)

  let systemPrompt = ""

  if (userMessageCount === 0) {
    // Initial welcome - this should already be in initialMessages
    systemPrompt = `You are AURA. Say: "Hello there! Welcome to our customer service. My name is AURA, your virtual assistant. How are you doing today, and how can I assist you?"`
  } else if (userMessageCount === 1) {
    // User just shared their complaint - MUST show empathy and ask when it started
    const userComplaint = userMessages[0]?.content || ""
    systemPrompt = `You are AURA. The customer just told you: "${userComplaint}"

You MUST respond with empathy and ask when it started. Say something like:

"I completely understand how frustrating this must be for you. Having trouble with your dashboard and not being able to access your account is really concerning. Let me make sure I understand correctly - you can't log in, your balance isn't showing, and nothing on your dashboard is working. When did this issue first start happening?"

CRITICAL: You MUST ask "When did this first start happening?" or "How long has this been going on?"`
  } else if (userMessageCount === 2) {
    // User provided timing info - ask for more specific details
    systemPrompt = `You are AURA. The customer provided timing information. Now ask for specific details about their account or the issue.

Say something like: "Thank you for that information. Can you tell me what type of account this is - is this a personal or business account? And are you getting any specific error messages when you try to log in?"

Keep it short and ask ONE specific question about their account type or error messages.`
  } else if (userMessageCount === 3) {
    // User provided details - now provide reassurance and ask for email
    systemPrompt = `You are AURA. You've gathered enough information. Now provide reassurance and ask for their email.

Say EXACTLY: "I want you to know that our team takes this very seriously. We will investigate this issue immediately and work to resolve it. Your complaint is important to us and will be prioritized. I'm going to ask you to submit your email address now so our team can follow up with you directly about the resolution."

CRITICAL: You MUST say "submit your email address" to trigger the email popup.`
  } else {
    // Fallback for any additional messages
    systemPrompt = `You are AURA. Ask for their email if you haven't already. Say: "I need you to submit your email address so our team can follow up with you."`
  }

  console.log("Using system prompt:", systemPrompt)

  const result = await streamText({
    model: google("gemini-1.5-pro"),
    system: systemPrompt,
    messages,
    maxTokens: 120,
  })

  return result.toDataStreamResponse()
}
