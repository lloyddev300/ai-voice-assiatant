"use client"

import { useState, useEffect } from "react"
import { AlertCircle, X } from "lucide-react"

export function SetupBanner() {
  const [setupStatus, setSetupStatus] = useState<{
    configured: boolean
    missing: string[]
    message: string
  } | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then(setSetupStatus)
      .catch(() => {
        setSetupStatus({
          configured: false,
          missing: ["GOOGLE_GENERATIVE_AI_API_KEY", "WEBHOOK_URL"],
          message: "Unable to check configuration",
        })
      })
  }, [])

  if (!setupStatus || setupStatus.configured || !isVisible) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-amber-800 mb-1">Setup Required</h3>
            <p className="text-sm text-amber-700 mb-2">Please add these environment variables:</p>
            <ul className="text-xs text-amber-600 space-y-1">
              {setupStatus.missing.map((envVar) => (
                <li key={envVar} className="font-mono">
                  • {envVar}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => setIsVisible(false)} className="text-amber-600 hover:text-amber-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
