"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, X } from "lucide-react"
import { useChat } from "ai/react"
import { SetupBanner } from "@/components/setup-banner"

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

export default function VoiceComplaintAgent() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isConversationActive, setIsConversationActive] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [lastUserMessage, setLastUserMessage] = useState("")
  const [showEmailPopup, setShowEmailPopup] = useState(false)
  const [customerEmail, setCustomerEmail] = useState("")
  const [conversationStep, setConversationStep] = useState(1) // Track conversation progress
  const [complaintData, setComplaintData] = useState({
    complaint: "",
    customerInfo: "",
    issueDetails: "",
    conversationHistory: [] as string[],
    empathyShown: false,
    detailsCollected: false,
  })

  const isPushToTalk = true

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const restartListeningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionActiveRef = useRef(false)

  const { messages, append, isLoading } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content:
          "Hello there! Welcome to our customer service. My name is AURA, your virtual assistant. How are you doing today, and how can I assist you?",
      },
    ],
    onFinish: (message) => {
      console.log("AI response received:", message.content)

      // Track conversation progress and trigger email popup
      const messageContent = message.content.toLowerCase()

      // Check if AI is showing empathy/acknowledgment
      if (
        messageContent.includes("understand") ||
        messageContent.includes("frustrating") ||
        messageContent.includes("upset")
      ) {
        setComplaintData((prev) => ({ ...prev, empathyShown: true }))
        setConversationStep(3)
      }

      // Check if AI is asking for details
      if (
        messageContent.includes("when") ||
        messageContent.includes("how long") ||
        messageContent.includes("what service")
      ) {
        setComplaintData((prev) => ({ ...prev, detailsCollected: true }))
        setConversationStep(4)
      }

      // Check if AI is asking for email - trigger popup
      if (messageContent.includes("email address") || messageContent.includes("submit your email")) {
        console.log("Email collection triggered!")
        setShowEmailPopup(true)
        setConversationStep(5)
      }

      // Store AI response in complaint data
      setComplaintData((prev) => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, `AURA: ${message.content}`],
      }))

      // Automatically speak the AI response
      speakText(message.content)
    },
  })

  useEffect(() => {
    // Request microphone permission first
    const requestMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        console.log("Microphone permission granted")
      } catch (error) {
        console.error("Microphone permission denied:", error)
        alert("Please allow microphone access to use voice features")
        return
      }
    }

    // Initialize speech recognition
    const initializeSpeechRecognition = async () => {
      await requestMicrophonePermission()

      if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          console.log("Speech recognition started")
          setIsListening(true)
          recognitionActiveRef.current = true
          setCurrentTranscript("")
          setInterimTranscript("")
        }

        recognition.onresult = (event: any) => {
          console.log("Speech recognition result received")
          let finalTranscript = ""
          let interimText = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            console.log("Transcript:", transcript, "Final:", event.results[i].isFinal)

            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimText += transcript
            }
          }

          setInterimTranscript(interimText)

          if (finalTranscript.trim()) {
            const fullMessage = (currentTranscript + finalTranscript).trim()
            console.log("Processing final message:", fullMessage)

            setCurrentTranscript(fullMessage)
            setLastUserMessage(fullMessage)

            // Store user message in complaint data
            updateComplaintData(fullMessage)

            // Send to AI
            handleVoiceInput(fullMessage)
          }
        }

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error)

          if (event.error === "no-speech") {
            console.log("No speech detected, ignoring error")
            return
          }

          setIsListening(false)
          recognitionActiveRef.current = false
        }

        recognition.onend = () => {
          console.log("Speech recognition ended")
          setIsListening(false)
          recognitionActiveRef.current = false
          setInterimTranscript("")
        }

        recognitionRef.current = recognition
        console.log("Speech recognition initialized")
      } else {
        console.error("Speech recognition not supported")
        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.")
      }
    }

    initializeSpeechRecognition()

    // Initialize speech synthesis
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log("Available voices:", voices.length)
        setVoicesReady(true)
      }

      if (window.speechSynthesis.getVoices().length) {
        loadVoices()
      }

      window.speechSynthesis.addEventListener("voiceschanged", loadVoices)
      setTimeout(loadVoices, 1000)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (restartListeningTimerRef.current) {
        clearTimeout(restartListeningTimerRef.current)
      }
    }
  }, [])

  const updateComplaintData = (userMessage: string) => {
    console.log("Updating complaint data with:", userMessage)

    setComplaintData((prev) => {
      const userMessageCount = messages.filter((m) => m.role === "user").length
      const newData = { ...prev }

      // Add to conversation history
      newData.conversationHistory = [...prev.conversationHistory, `User: ${userMessage}`]

      // Categorize the message based on conversation step
      if (conversationStep === 1 || conversationStep === 2) {
        // Initial complaint
        if (!newData.complaint) {
          newData.complaint = userMessage
          console.log("Stored as main complaint:", userMessage)
          setConversationStep(2)
        } else {
          newData.complaint += ` ${userMessage}`
        }
      } else if (conversationStep === 3 || conversationStep === 4) {
        // Additional details after empathy
        newData.issueDetails = newData.issueDetails ? `${newData.issueDetails} ${userMessage}` : userMessage
        console.log("Stored as issue details:", userMessage)
      } else {
        // Additional customer information
        newData.customerInfo = prev.customerInfo ? `${prev.customerInfo} ${userMessage}` : userMessage
        console.log("Stored as customer info:", userMessage)
      }

      return newData
    })
  }

  const startConversation = () => {
    console.log("Starting conversation...")
    setIsConversationActive(true)
    setLastUserMessage("")
    setCurrentTranscript("")
    setInterimTranscript("")
    setConversationStep(1)
    setComplaintData({
      complaint: "",
      customerInfo: "",
      issueDetails: "",
      conversationHistory: [],
      empathyShown: false,
      detailsCollected: false,
    })

    // Speak the initial greeting
    const initialMessage = messages[0]?.content
    if (initialMessage) {
      speakText(initialMessage)
    }
  }

  const endConversation = () => {
    console.log("Ending conversation...")

    // If we haven't collected email yet, show popup
    if (!customerEmail && conversationStep >= 3) {
      setShowEmailPopup(true)
      return
    }

    setIsConversationActive(false)
    stopListening()
    stopSpeaking()
    setCurrentTranscript("")
    setInterimTranscript("")
    setLastUserMessage("")

    // Send complaint data if we have any conversation
    if (messages.length > 1) {
      sendComplaintData()
    }
  }

  const startListening = () => {
    if (!recognitionRef.current) {
      console.error("Speech recognition not initialized")
      return
    }

    if (recognitionActiveRef.current) {
      console.log("Recognition already active")
      return
    }

    if (isSpeaking) {
      console.log("Cannot start listening while speaking")
      return
    }

    console.log("Starting speech recognition...")

    try {
      recognitionRef.current.start()
    } catch (err: any) {
      console.error("Error starting recognition:", err)

      if (err.name === "InvalidStateError") {
        setTimeout(() => {
          if (recognitionRef.current && !recognitionActiveRef.current) {
            try {
              recognitionRef.current.stop()
              setTimeout(() => {
                if (!recognitionActiveRef.current) {
                  recognitionRef.current?.start()
                }
              }, 500)
            } catch (e) {
              console.error("Failed to recover:", e)
            }
          }
        }, 100)
      }
    }
  }

  const stopListening = () => {
    console.log("Stopping speech recognition...")
    if (recognitionRef.current && recognitionActiveRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    recognitionActiveRef.current = false
  }

  const speakText = (text: string) => {
    if (!synthRef.current || !voicesReady || !text) {
      console.log("Cannot speak - missing requirements")
      return
    }

    console.log("Speaking:", text)

    if (synthRef.current.speaking) {
      synthRef.current.cancel()
    }

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0
      utterance.lang = "en-US"

      const voices = synthRef.current!.getVoices()
      const americanVoice =
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("google")) ??
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("microsoft")) ??
        voices.find((v) => v.lang === "en-US") ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0]

      if (americanVoice) {
        utterance.voice = americanVoice
        console.log("Using voice:", americanVoice.name)
      }

      utterance.onstart = () => {
        console.log("Speech started")
        setIsSpeaking(true)
        stopListening()
      }

      utterance.onend = () => {
        console.log("Speech ended")
        setIsSpeaking(false)
      }

      utterance.onerror = (event) => {
        console.error("Speech error:", event)
        setIsSpeaking(false)
      }

      synthRef.current!.speak(utterance)
    }, 200)
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const handleVoiceInput = (text: string) => {
    console.log("Sending to AI:", text)

    // Send to AI
    append({
      role: "user",
      content: text,
    })

    // Clear current transcript but keep the last message for display
    setTimeout(() => {
      setCurrentTranscript("")
      setInterimTranscript("")
    }, 100)
  }

  const handleEmailSubmit = () => {
    if (customerEmail.trim()) {
      console.log("Email submitted:", customerEmail)
      setShowEmailPopup(false)

      // Update complaint data with email
      setComplaintData((prev) => ({
        ...prev,
        customerInfo: prev.customerInfo ? `${prev.customerInfo} Email: ${customerEmail}` : `Email: ${customerEmail}`,
      }))

      // Send complaint data immediately
      sendComplaintData()

      // Continue conversation with confirmation
      append({
        role: "user",
        content: `My email is ${customerEmail}`,
      })

      // End conversation after email is collected
      setTimeout(() => {
        setIsConversationActive(false)
        stopListening()
        stopSpeaking()
      }, 3000)
    }
  }

  const sendComplaintData = async () => {
    console.log("Sending complaint data...")

    try {
      const complaintPayload = {
        timestamp: new Date().toISOString(),
        conversation: messages,
        complaintData: complaintData,
        customerEmail: customerEmail,
        conversationDuration: messages.length,
        conversationStep: conversationStep,
        summary: {
          mainComplaint: complaintData.complaint,
          issueDetails: complaintData.issueDetails,
          customerInfo: complaintData.customerInfo,
          fullConversation: complaintData.conversationHistory,
          empathyShown: complaintData.empathyShown,
          detailsCollected: complaintData.detailsCollected,
        },
      }

      console.log("Complaint payload:", complaintPayload)

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(complaintPayload),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Complaint data sent successfully:", result)
      } else {
        console.error("Failed to send complaint data:", response.status)
      }
    } catch (error) {
      console.error("Error sending complaint:", error)
    }
  }

  const getConversationStatus = () => {
    if (!isConversationActive) return "Ready to start"
    if (isSpeaking) return "AURA speaking..."
    if (isListening) return "Listening..."
    if (isLoading) return "AURA thinking..."
    return `Step ${conversationStep}/5 - Ready to listen`
  }

  const getConversationStepName = () => {
    switch (conversationStep) {
      case 1:
        return "Welcome"
      case 2:
        return "Capturing Complaint"
      case 3:
        return "Showing Empathy"
      case 4:
        return "Collecting Details"
      case 5:
        return "Email Collection"
      default:
        return "Active"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 p-4 flex items-center justify-center">
      <SetupBanner />

      {/* Email Popup */}
      {showEmailPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Submit Your Email</h3>
              <Button onClick={() => setShowEmailPopup(false)} variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please provide your email address so our team can follow up on your complaint and keep you updated on the
              resolution.
            </p>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === "Enter" && customerEmail.trim()) {
                  handleEmailSubmit()
                }
              }}
            />
            <Button
              onClick={handleEmailSubmit}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              disabled={!customerEmail.trim()}
            >
              Submit Email & Complete
            </Button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm mx-auto">
        {/* Phone Frame */}
        <div className="bg-white/20 backdrop-blur-lg rounded-[2.5rem] p-6 shadow-2xl border border-white/30">
          {/* Status Bar */}
          <div className="flex justify-between items-center mb-8 text-white/80 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white rounded-full"></div>
              <div className="w-1 h-1 bg-white/50 rounded-full"></div>
            </div>
            <div className="text-xs font-medium">9:41</div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-white/60 rounded-sm">
                <div className="w-2 h-1 bg-white rounded-sm m-0.5"></div>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-white text-2xl font-medium mb-4">AURA Assistant</h1>
            <p className="text-white/80 text-lg">{getConversationStatus()}</p>
            {isConversationActive && <p className="text-white/60 text-sm mt-2">{getConversationStepName()}</p>}
          </div>

          {/* Live Transcription */}
          {isConversationActive && (
            <div className="mb-6">
              {/* Current/Live Speech */}
              {isListening && (currentTranscript || interimTranscript) && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    You're saying:
                  </p>
                  <p className="text-sm text-gray-800 min-h-[20px]">
                    {currentTranscript}
                    <span className="text-gray-400 italic">{interimTranscript}</span>
                    {(currentTranscript || interimTranscript) && <span className="animate-pulse">|</span>}
                  </p>
                </div>
              )}

              {/* Last Complete Message */}
              {lastUserMessage && !isListening && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 mb-3">
                  <p className="text-xs text-white/80 mb-2">You said:</p>
                  <p className="text-sm text-white font-medium">{lastUserMessage}</p>
                </div>
              )}

              {/* AI Thinking Indicator */}
              {isLoading && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    AURA is thinking...
                  </p>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Conversation Progress */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-600">Conversation Progress</p>
                  <p className="text-xs text-gray-500">{conversationStep}/5</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`h-2 flex-1 rounded-full ${
                        step <= conversationStep ? "bg-purple-500" : "bg-gray-300"
                      }`}
                    ></div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Welcome</span>
                  <span>Complaint</span>
                  <span>Empathy</span>
                  <span>Details</span>
                  <span>Email</span>
                </div>
              </div>

              {/* Debug Info */}
              {process.env.NODE_ENV === "development" && (
                <div className="bg-gray-800/80 rounded-lg p-2 mb-3 text-xs text-white">
                  <p>Messages: {messages.length}</p>
                  <p>Complaint: {complaintData.complaint ? "✓" : "✗"}</p>
                  <p>Empathy: {complaintData.empathyShown ? "✓" : "✗"}</p>
                  <p>Details: {complaintData.detailsCollected ? "✓" : "✗"}</p>
                  <p>History: {complaintData.conversationHistory.length}</p>
                </div>
              )}
            </div>
          )}

          {/* Avatar */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                <div className="text-white text-5xl">{isSpeaking ? "🗣️" : isListening ? "👂" : "🤖"}</div>
                {(isListening || isSpeaking || isLoading) && (
                  <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-pulse"></div>
                )}
                {(isListening || isSpeaking || isLoading) && (
                  <div className="absolute inset-0 rounded-full border-8 border-white/20 animate-ping"></div>
                )}
              </div>
              {isConversationActive && (
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-8">
            {/* Main Conversation Control */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={isConversationActive ? endConversation : startConversation}
                size="lg"
                className={`w-20 h-20 rounded-full shadow-2xl transition-all duration-300 ${
                  isConversationActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isConversationActive ? (
                  <PhoneOff className="h-8 w-8 text-white" />
                ) : (
                  <Phone className="h-8 w-8 text-white" />
                )}
              </Button>

              {/* Manual Speak Button */}
              {isConversationActive && (
                <Button
                  size="lg"
                  className={`w-20 h-20 rounded-full shadow-2xl transition-all duration-300 ${
                    isListening ? "bg-red-500 scale-110" : "bg-blue-500"
                  }`}
                  disabled={isSpeaking}
                  onMouseDown={() => startListening()}
                  onMouseUp={() => stopListening()}
                  onTouchStart={() => startListening()}
                  onTouchEnd={() => stopListening()}
                >
                  {isListening ? (
                    <div className="text-white text-2xl">🎤</div>
                  ) : (
                    <div className="text-white text-2xl">🗣️</div>
                  )}
                </Button>
              )}
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center gap-6 text-sm text-white/70">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${isListening ? "bg-red-400 animate-pulse" : "bg-white/30"}`}
                ></div>
                <span>Listening</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-blue-400 animate-pulse" : "bg-white/30"}`}
                ></div>
                <span>Speaking</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${isConversationActive ? "bg-green-400 animate-pulse" : "bg-white/30"}`}
                ></div>
                <span>Active</span>
              </div>
            </div>

            {/* Instructions */}
            {!isConversationActive ? (
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
