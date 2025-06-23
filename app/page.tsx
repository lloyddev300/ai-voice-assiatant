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
  const [conversationStep, setConversationStep] = useState(1)
  const [complaintData, setComplaintData] = useState({
    complaint: "",
    customerInfo: "",
    issueDetails: "",
    conversationHistory: [] as string[],
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
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

      // Force step progression based on user message count
      const userMessageCount = messages.filter((m) => m.role === "user").length

      if (userMessageCount === 1) {
        // After first user message, we should be showing empathy
        setConversationStep(3)
        console.log("Moving to empathy step")
      } else if (userMessageCount === 2) {
        // After second user message, we should be collecting details
        setConversationStep(4)
        console.log("Moving to details step")
      } else if (userMessageCount >= 3) {
        // After third user message, we should be asking for email
        setConversationStep(5)
        console.log("Moving to email step")
      }

      // Check for email trigger phrases
      const messageContent = message.content.toLowerCase()
      if (
        messageContent.includes("submit your email") ||
        messageContent.includes("email address") ||
        messageContent.includes("follow up with you")
      ) {
        console.log("Email popup triggered!")
        setShowEmailPopup(true)
      }

      // Store AI response
      setComplaintData((prev) => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, `AURA: ${message.content}`],
      }))

      // Speak the response
      speakText(message.content)
    },
  })

  useEffect(() => {
    const initializeSpeechRecognition = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        console.log("Microphone permission granted")
      } catch (error) {
        console.error("Microphone permission denied:", error)
        return
      }

      if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onstart = () => {
          console.log("Speech recognition started")
          setIsListening(true)
          recognitionActiveRef.current = true
          setCurrentTranscript("")
          setInterimTranscript("")
        }

        recognition.onresult = (event: any) => {
          let finalTranscript = ""
          let interimText = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimText += transcript
            }
          }

          setInterimTranscript(interimText)

          if (finalTranscript.trim()) {
            const fullMessage = (currentTranscript + finalTranscript).trim()
            console.log("Processing message:", fullMessage)

            setCurrentTranscript(fullMessage)
            setLastUserMessage(fullMessage)
            updateComplaintData(fullMessage)
            handleVoiceInput(fullMessage)
          }
        }

        recognition.onerror = (event: any) => {
          if (event.error === "no-speech") return
          console.warn("Speech recognition error:", event.error)
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
      }
    }

    initializeSpeechRecognition()

    // Initialize speech synthesis
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
      const loadVoices = () => setVoicesReady(true)
      if (window.speechSynthesis.getVoices().length) {
        loadVoices()
      }
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices)
      setTimeout(loadVoices, 1000)
    }
  }, [])

  const updateComplaintData = (userMessage: string) => {
    console.log("Storing complaint data:", userMessage)

    setComplaintData((prev) => {
      const newData = { ...prev }
      newData.conversationHistory = [...prev.conversationHistory, `User: ${userMessage}`]

      const userMessageCount = messages.filter((m) => m.role === "user").length

      if (userMessageCount === 0) {
        newData.complaint = userMessage
      } else if (userMessageCount === 1) {
        newData.issueDetails = userMessage
      } else {
        newData.customerInfo = prev.customerInfo ? `${prev.customerInfo} ${userMessage}` : userMessage
      }

      return newData
    })
  }

  const startConversation = () => {
    console.log("Starting conversation...")
    setIsConversationActive(true)
    setConversationStep(1)
    setComplaintData({
      complaint: "",
      customerInfo: "",
      issueDetails: "",
      conversationHistory: [],
    })

    const initialMessage = messages[0]?.content
    if (initialMessage) {
      speakText(initialMessage)
    }
  }

  const endConversation = () => {
    console.log("Ending conversation...")
    setIsConversationActive(false)
    stopListening()
    stopSpeaking()
    setCurrentTranscript("")
    setLastUserMessage("")

    if (messages.length > 1) {
      sendComplaintData()
    }
  }

  const startListening = () => {
    if (!recognitionRef.current || recognitionActiveRef.current || isSpeaking) return

    try {
      recognitionRef.current.start()
    } catch (err: any) {
      console.error("Error starting recognition:", err)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && recognitionActiveRef.current) {
      recognitionRef.current.stop()
    }
  }

  const speakText = (text: string) => {
    if (!synthRef.current || !voicesReady || !text) return

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
      const americanVoice = voices.find((v) => v.lang === "en-US") || voices[0]
      if (americanVoice) utterance.voice = americanVoice

      utterance.onstart = () => {
        setIsSpeaking(true)
        stopListening()
      }

      utterance.onend = () => {
        setIsSpeaking(false)
      }

      utterance.onerror = () => {
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
    append({ role: "user", content: text })
    setTimeout(() => {
      setCurrentTranscript("")
      setInterimTranscript("")
    }, 100)
  }

  const handleEmailSubmit = () => {
    if (customerEmail.trim()) {
      console.log("Email submitted:", customerEmail)
      setShowEmailPopup(false)

      setComplaintData((prev) => ({
        ...prev,
        customerInfo: `${prev.customerInfo} Email: ${customerEmail}`,
      }))

      sendComplaintData()

      append({
        role: "user",
        content: `My email is ${customerEmail}`,
      })

      setTimeout(() => {
        setIsConversationActive(false)
        stopListening()
        stopSpeaking()
      }, 2000)
    }
  }

  const sendComplaintData = async () => {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        conversation: messages,
        complaintData: complaintData,
        customerEmail: customerEmail,
        conversationStep: conversationStep,
      }

      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        console.log("Complaint sent successfully")
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
    return "Ready to listen"
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
              Please provide your email so our team can follow up on your complaint.
            </p>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
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
          </div>

          {/* Live Transcription */}
          {isConversationActive && (
            <div className="mb-6">
              {/* Current Speech */}
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

              {/* Last Message */}
              {lastUserMessage && !isListening && (
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 mb-3">
                  <p className="text-xs text-white/80 mb-2">You said:</p>
                  <p className="text-sm text-white font-medium">{lastUserMessage}</p>
                </div>
              )}

              {/* AI Thinking */}
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

              {/* Progress */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-gray-600">Conversation Progress</p>
                  <p className="text-xs text-gray-500">{conversationStep}/5</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`h-2 flex-1 rounded-full ${step <= conversationStep ? "bg-purple-500" : "bg-gray-300"}`}
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

              {isConversationActive && (
                <Button
                  size="lg"
                  className={`w-20 h-20 rounded-full shadow-2xl transition-all duration-300 ${
                    isListening ? "bg-red-500 scale-110" : "bg-blue-500"
                  }`}
                  disabled={isSpeaking}
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onTouchStart={startListening}
                  onTouchEnd={stopListening}
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
