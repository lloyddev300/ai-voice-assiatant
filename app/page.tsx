"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff } from "lucide-react"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"
import { useConversationFlow } from "@/hooks/useConversationFlow"
import { EmailModal } from "@/components/EmailModal"
import { ConversationProgress } from "@/components/ConversationProgress"

export default function AuraVoiceAgent() {
  const [isActive, setIsActive] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis()
  const { currentStep, steps, complaintData, updateStep, addToHistory, updateComplaintData, reset } =
    useConversationFlow()

  const handleSpeechResult = useCallback(
    async (transcript: string) => {
      console.log("User said:", transcript)
      setLastUserMessage(transcript)
      addToHistory("User", transcript)

      // Store the user input based on current step
      if (currentStep === 2) {
        updateComplaintData("complaint", transcript)
      } else if (currentStep === 3) {
        updateComplaintData("timing", transcript)
      } else if (currentStep === 4) {
        updateComplaintData("details", transcript)
      }

      // Generate AI response
      setIsProcessing(true)
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: currentStep + 1 }),
        })

        if (response.ok) {
          const reader = response.body?.getReader()
          let aiResponse = ""

          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = new TextDecoder().decode(value)
              const lines = chunk.split("\n")

              for (const line of lines) {
                if (line.startsWith("0:")) {
                  try {
                    const data = JSON.parse(line.slice(2))
                    if (data.type === "text-delta") {
                      aiResponse += data.textDelta
                    }
                  } catch (e) {
                    // Ignore parsing errors
                  }
                }
              }
            }
          }

          if (aiResponse) {
            console.log("AI response:", aiResponse)
            addToHistory("AURA", aiResponse)
            speak(aiResponse)

            // Advance to next step
            const nextStep = Math.min(currentStep + 1, 5)
            updateStep(nextStep)

            // Show email modal at step 4
            if (nextStep === 5) {
              setTimeout(() => setShowEmailModal(true), 2000)
            }
          }
        }
      } catch (error) {
        console.error("Failed to get AI response:", error)
      } finally {
        setIsProcessing(false)
      }
    },
    [currentStep, speak, addToHistory, updateComplaintData, updateStep],
  )

  const { isListening, currentTranscript, interimTranscript, startListening, stopListening } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onError: (error) => console.error("Speech recognition error:", error),
  })

  const startConversation = useCallback(async () => {
    console.log("Starting conversation...")
    setIsActive(true)
    reset()
    setLastUserMessage("")
    setShowEmailModal(false)

    // Start with welcome message
    const welcomeMessage = "Hello! I'm AURA, your virtual assistant. How can I help you today?"
    addToHistory("AURA", welcomeMessage)
    speak(welcomeMessage)
    updateStep(2) // Move to complaint capture step
  }, [reset, addToHistory, speak, updateStep])

  const endConversation = useCallback(() => {
    console.log("Ending conversation...")
    setIsActive(false)
    stopListening()
    stopSpeaking()
    setLastUserMessage("")

    // Send complaint data if we have any
    if (complaintData.complaint) {
      sendComplaintData()
    }
  }, [stopListening, stopSpeaking, complaintData])

  const handleEmailSubmit = useCallback(
    (email: string) => {
      console.log("Email submitted:", email)
      updateComplaintData("email", email)
      setShowEmailModal(false)

      // Send final confirmation
      const confirmationMessage =
        "Thank you for providing your email. Our team will contact you within 24 hours with an update on your complaint."
      addToHistory("AURA", confirmationMessage)
      speak(confirmationMessage)

      // Send complaint data and end conversation
      setTimeout(() => {
        sendComplaintData()
        endConversation()
      }, 3000)
    },
    [updateComplaintData, addToHistory, speak, endConversation],
  )

  const sendComplaintData = useCallback(async () => {
    try {
      const payload = {
        complaintData,
        completedSteps: steps.filter((s) => s.completed).length,
        timestamp: new Date().toISOString(),
      }

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        console.log("Complaint data sent successfully")
      } else {
        console.error("Failed to send complaint data")
      }
    } catch (error) {
      console.error("Error sending complaint data:", error)
    }
  }, [complaintData, steps])

  const getStatus = () => {
    if (!isActive) return "Ready to start"
    if (isSpeaking) return "AURA speaking..."
    if (isListening) return "Listening..."
    if (isProcessing) return "AURA thinking..."
    return "Ready to listen"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 p-4 flex items-center justify-center">
      <EmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} onSubmit={handleEmailSubmit} />

      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white/20 backdrop-blur-lg rounded-[2.5rem] p-6 shadow-2xl border border-white/30">
          {/* Status Bar */}
          <div className="flex justify-between items-center mb-8 text-white/80 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white/50 rounded-full" />
            </div>
            <div className="text-xs font-medium">9:41</div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-white/60 rounded-sm">
                <div className="w-2 h-1 bg-white rounded-sm m-0.5" />
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-white text-2xl font-medium mb-4">AURA Assistant</h1>
            <p className="text-white/80 text-lg">{getStatus()}</p>
            {isActive && (
              <p className="text-white/60 text-sm mt-2">
                Step {currentStep}/5 - {steps.find((s) => s.id === currentStep)?.name}
              </p>
            )}
          </div>

          {/* Conversation Interface */}
          {isActive && (
            <div className="mb-6">
              {/* Current Speech */}
              {isListening && (currentTranscript || interimTranscript) && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    You're saying:
                  </p>
                  <p className="text-sm text-gray-800 min-h-[20px]">
                    {currentTranscript}
                    <span className="text-gray-400 italic">{interimTranscript}</span>
                    {(currentTranscript || interimTranscript) && <span className="animate-pulse">|</span>}
                  </p>
                </div>
              )}

              {/* Last Message */}
              {lastUserMessage && !isListening && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 mb-3">
                  <p className="text-xs text-white/80 mb-2">You said:</p>
                  <p className="text-sm text-white font-medium">{lastUserMessage}</p>
                </div>
              )}

              {/* AI Thinking */}
              {isProcessing && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    AURA is thinking...
                  </p>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              )}

              {/* Progress */}
              <ConversationProgress steps={steps} currentStep={currentStep} />
            </div>
          )}

          {/* Avatar */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                <div className="text-white text-5xl">{isSpeaking ? "🗣️" : isListening ? "👂" : "🤖"}</div>
                {(isListening || isSpeaking || isProcessing) && (
                  <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-pulse" />
                )}
              </div>
              {isActive && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-8">
            <div className="flex justify-center gap-4">
              <Button
                onClick={isActive ? endConversation : startConversation}
                size="lg"
                className={`w-20 h-20 rounded-full shadow-2xl transition-all duration-300 ${
                  isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isActive ? <PhoneOff className="h-8 w-8 text-white" /> : <Phone className="h-8 w-8 text-white" />}
              </Button>

              {isActive && (
                <Button
                  size="lg"
                  className={`w-20 h-20 rounded-full shadow-2xl transition-all duration-300 ${
                    isListening ? "bg-red-500 scale-110" : "bg-blue-500"
                  }`}
                  disabled={isSpeaking || isProcessing}
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
                >
                  <div className="text-white text-2xl">{isListening ? "🎤" : "🗣️"}</div>
                </Button>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center gap-6 text-sm text-white/70">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isListening ? "bg-red-400 animate-pulse" : "bg-white/30"}`} />
                <span>Listening</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-blue-400 animate-pulse" : "bg-white/30"}`} />
                <span>Speaking</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-white/30"}`} />
                <span>Active</span>
              </div>
            </div>

            {/* Instructions */}
            {!isActive ? (
              <div className="text-center text-white/60 text-sm px-4">
                <p>Tap the green button to start talking with AURA</p>
                <p className="mt-2">I'm here to help with your service complaints</p>
              </div>
            ) : (
              <div className="text-center text-white/60 text-sm px-4">
                <p>Hold the blue button to speak</p>
                <p className="mt-1">Release when you're done talking</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
