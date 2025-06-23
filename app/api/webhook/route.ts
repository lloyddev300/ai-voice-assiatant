export async function POST(req: Request) {
  try {
    const data = await req.json()

    console.log("Complaint conversation received:", data)

    // Extract complaint information from conversation
    const complaintSummary = {
      timestamp: data.timestamp,
      conversationLength: data.conversation?.length || 0,
      customerMessages: data.conversation?.filter((msg: any) => msg.role === "user") || [],
      fullConversation: data.conversation || [],
      complaintData: data.complaintData || {},
      customerEmail: data.customerEmail || "",
      conversationStep: data.conversationStep || 0,
      summary: data.summary || {},
      source: "ai_voice_agent",
    }

    // Send to Make.com webhook
    const webhookUrl = "https://hook.eu2.make.com/nt3ksn919sac480tcliv0an9gtemlej1"

    console.log("Sending to Make.com webhook:", webhookUrl)
    console.log("Payload:", JSON.stringify(complaintSummary, null, 2))

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(complaintSummary),
    })

    if (!webhookResponse.ok) {
      console.error("Webhook delivery failed:", webhookResponse.status, webhookResponse.statusText)
      const errorText = await webhookResponse.text()
      console.error("Webhook error response:", errorText)
      throw new Error(`Webhook delivery failed: ${webhookResponse.status}`)
    }

    const webhookResult = await webhookResponse.json().catch(() => ({}))
    console.log("Webhook delivery successful:", webhookResult)

    return Response.json({
      success: true,
      message: "Complaint conversation processed and sent to Make.com successfully",
      timestamp: new Date().toISOString(),
      webhookResponse: webhookResult,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to process complaint",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
