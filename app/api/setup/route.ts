export async function GET() {
  const requiredEnvVars = {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  return Response.json({
    configured: missingVars.length === 0,
    missing: missingVars,
    message:
      missingVars.length === 0
        ? "All environment variables are configured!"
        : `Missing environment variables: ${missingVars.join(", ")}`,
  })
}
