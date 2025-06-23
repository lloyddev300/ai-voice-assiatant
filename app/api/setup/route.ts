export async function GET() {
  const requiredEnvVars = {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  return Response.json({
    configured: missingVars.length === 0,
    missing: missingVars,
    webhookUrl: "https://hook.eu2.make.com/nt3ksn919sac480tcliv0an9gtemlej1",
    message:
      missingVars.length === 0
        ? "All environment variables are configured! Webhook URL is set to Make.com."
        : `Missing environment variables: ${missingVars.join(", ")}`,
  })
}
