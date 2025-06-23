import { streamText } from "ai"
import { google } from "@ai-sdk/google"

const STEP_PROMPTS = {
  1: `You are AURA, a friendly AI assistant. Say exactly: "Hello! I'm AURA, your virtual assistant. How can I help you today?"`,

  2: `The customer just shared their complaint. Respond with empathy and ask when it started. Say exactly: "I'm so sorry to hear about this issue. That sounds really frustrating. When did this problem first start happening?"`,

  3: `The customer provided timing information. Ask for account details. Say exactly: "Thank you for that information. Can you tell me what type of account this is - personal or business?"`,

  4: `The customer provided account details. Now ask for their email. Say exactly: "I understand. Our team will investigate this immediately. I need you to submit your email address so we can follow up with you directly."`,

  5: `Thank the customer. Say exactly: "Thank you for providing your email. Our team will contact you within 24 hours with an update on your complaint."`,
}

export async function POST(req: Request) {
  try {
    const { step } = await req.json()

    console.log(`API: Generating response for step ${step}`)

    const systemPrompt = STEP_PROMPTS[step as keyof typeof STEP_PROMPTS] || STEP_PROMPTS[1]

    const result = await streamText({
      model: google("gemini-1.5-pro"),
      system: systemPrompt,
      messages: [{ role: "user", content: "Continue" }],
      maxTokens: 100,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
