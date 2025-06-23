export async function POST(req: Request) {
  try {
    const data = await req.json()

    console.log("Webhook: Received complaint data")

    const payload = {
      timestamp: new Date().toISOString(),
      source: "aura_voice_agent",
      complaint: data.complaintData.complaint,
      timing: data.complaintData.timing,
      details: data.complaintData.details,
      customerEmail: data.complaintData.email,
      conversationHistory: data.complaintData.conversationHistory,
      completedSteps: data.completedSteps,
    }

    // Send to Make.com webhook
    const webhookUrl = "https://hook.eu2.make.com/nt3ksn919sac480tcliv0an9gtemlej1"

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }

    console.log("Webhook: Successfully sent to Make.com")

    return Response.json({
      success: true,
      message: "Complaint data sent successfully",
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return Response.json({ success: false, error: "Failed to send complaint data" }, { status: 500 })
  }
}
