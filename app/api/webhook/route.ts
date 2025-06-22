export async function POST(req: Request) {
  try {
    const data = await req.json()

    console.log("Complaint conversation received:", data)

    // Extract complaint information from conversation
    const complaintSummary = {
      timestamp: data.timestamp,
      conversationLength: data.conversation.length,
      customerMessages: data.conversation.filter((msg: any) => msg.role === "user"),
      fullConversation: data.conversation,
      source: "ai_voice_agent",
    }

    // Send to your webhook endpoint
    const webhookUrl = process.env.WEBHOOK_URL || "https://your-webhook-endpoint.com/complaints"

    // Uncomment to actually send to webhook:
    /*
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`,
      },
      body: JSON.stringify(complaintSummary)
    })
    
    if (!webhookResponse.ok) {
      throw new Error('Webhook delivery failed')
    }
    */

    return Response.json({
      success: true,
      message: "Complaint conversation processed successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ success: false, error: "Failed to process complaint" }, { status: 500 })
  }
}
