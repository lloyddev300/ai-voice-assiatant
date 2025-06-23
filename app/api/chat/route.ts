import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Count user messages to determine conversation step
  const userMessages = messages.filter((m: any) => m.role === "user")
  const userMessageCount = userMessages.length

  console.log(`API: Processing message ${userMessageCount + 1}`)
  console.log(
    `API: User messages so far:`,
    userMessages.map((m) => m.content),
  )

  let systemPrompt = ""

  switch (userMessageCount) {
    case 0:
      // This shouldn't happen due to initialMessages, but just in case
      systemPrompt = `Say: "Hello! I'm AURA. How can I help you today?"`
      break

    case 1:
      // User just shared their complaint - show empathy and ask timing
      systemPrompt = `The customer said: "${userMessages[0].content}"

Respond with empathy and ask when it started. Say exactly:

"I'm so sorry to hear about this issue. That sounds really frustrating. When did this problem first start happening?"`
      break

    case 2:
      // User provided timing - ask for account details
      systemPrompt = `The customer provided timing info. Ask for account details. Say exactly:

"Thank you for that information. Can you tell me what type of account this is - personal or business?"`
      break

    case 3:
      // User provided details - ask for email
      systemPrompt = `The customer provided account details. Now ask for email. Say exactly:

"I understand. Our team will investigate this immediately. I need you to submit your email address so we can follow up with you directly."`
      break

    default:
      // Fallback
      systemPrompt = `Ask for their email. Say: "Please submit your email address for follow-up."`
  }

  console.log(`API: Using system prompt:`, systemPrompt)

  const result = await streamText({
    model: google("gemini-1.5-pro"),
    system: systemPrompt,
    messages: [{ role: "user", content: "Continue the conversation" }], // Simple prompt
    maxTokens: 80,
  })

  return result.toDataStreamResponse()
}
