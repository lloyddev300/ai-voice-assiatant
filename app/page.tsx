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
  const [complaintData, setComplaintData] = useState({
    complaint: "",
    customerInfo: "",
    issueDetails: "",
  })

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
      // Check if AI is asking for email
      if (message.content.toLowerCase().includes("email") && message.content.toLowerCase().includes("submit")) {
        setShowEmailPopup(true)
      }

      // Automatically speak the AI response
      speakText(message.content)
    },
  })

  useEffect(() => {
    // Request microphone permission first
    const requestMicrophonePermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop()) // Stop the stream, we just needed permission
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

        // More aggressive settings
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

          // Update live transcription
          setInterimTranscript(interimText)
          if (finalTranscript) {
            setCurrentTranscript((prev) => prev + finalTranscript)

            // Process final transcript immediately
            const fullMessage = (currentTranscript + finalTranscript).trim()
            if (fullMessage) {
              console.log("Processing final message:", fullMessage)
              setLastUserMessage(fullMessage)
              updateComplaintData(fullMessage)
              handleVoiceInput(fullMessage)
            }
          }
        }

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
          recognitionActiveRef.current = false

          // Auto-restart on most errors
          if (isConversationActive && !isSpeaking) {
            setTimeout(() => {
              if (isConversationActive && !isSpeaking && !recognitionActiveRef.current) {
                console.log("Restarting after error...")
                startListening()
              }
            }, 1000)
          }
        }

        recognition.onend = () => {
          console.log("Speech recognition ended")
          setIsListening(false)
          recognitionActiveRef.current = false
          setInterimTranscript("")

          // Immediate restart if conversation is active
          if (isConversationActive && !isSpeaking) {
            setTimeout(() => {
              if (isConversationActive && !isSpeaking && !recognitionActiveRef.current) {
                console.log("Auto-restarting listening...")
                startListening()
              }
            }, 100) // Very fast restart
          }
        }

        recognitionRef.current = recognition
        console.log("Speech recognition initialized")
      } else {
        console.error("Speech recognition not supported")
        alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.")
      }
    }

    initializeSpeechRecognition()

    // Initialize speech synthesis with better voice loading
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        console.log(
          "Available voices:",
          voices.map((v) => `${v.name} (${v.lang})`),
        )
        setVoicesReady(true)
      }

      // Load voices immediately if available
      if (window.speechSynthesis.getVoices().length) {
        loadVoices()
      }

      // Also listen for the event
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices)

      // Force load voices after a delay
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
  }, [isConversationActive, isSpeaking])

  const updateComplaintData = (userMessage: string) => {
    // Simple logic to categorize user input
    const messageCount = messages.filter((m) => m.role === "user").length

    if (messageCount === 0) {
      // First user message is likely the main complaint
      setComplaintData((prev) => ({ ...prev, complaint: userMessage }))
    } else if (messageCount === 1) {
      // Second message might contain additional details
      setComplaintData((prev) => ({ ...prev, issueDetails: userMessage }))
    } else {
      // Additional customer information
      setComplaintData((prev) => ({ ...prev, customerInfo: prev.customerInfo + " " + userMessage }))
    }
  }

  const startConversation = () => {
    console.log("Starting conversation...")
    setIsConversationActive(true)
    setLastUserMessage("")
    setCurrentTranscript("")
    setInterimTranscript("")
    setComplaintData({ complaint: "", customerInfo: "", issueDetails: "" })

    // Speak the initial greeting
    const initialMessage = messages[0]?.content
    if (initialMessage) {
      speakText(initialMessage)
    } else {
      // If no initial message, start listening immediately
      setTimeout(() => {
        startListening()
      }, 1000)
    }
  }

  const endConversation = () => {
    setIsConversationActive(false)
    stopListening()
    stopSpeaking()
    setCurrentTranscript("")
    setInterimTranscript("")
    setLastUserMessage("")
    setShowEmailPopup(false)

    // Send final complaint data
    if (messages.length > 2) {
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

    console.log("Attempting to start speech recognition...")

    try {
      recognitionRef.current.start()
      console.log("Speech recognition start() called successfully")
    } catch (err: any) {
      console.error("Error starting recognition:", err)

      // Try to recover from common errors
      if (err.name === "InvalidStateError") {
        // Recognition might be in a bad state, try to reset
        setTimeout(() => {
          if (recognitionRef.current && isConversationActive && !isSpeaking) {
            try {
              recognitionRef.current.stop()
              setTimeout(() => {
                if (isConversationActive && !isSpeaking) {
                  recognitionRef.current?.start()
                }
              }, 500)
            } catch (e) {
              console.error("Failed to recover from InvalidStateError:", e)
            }
          }
        }, 100)
      }
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && recognitionActiveRef.current) {
      recognitionRef.current.stop()
      recognitionActiveRef.current = false
    }
    if (restartListeningTimerRef.current) {
      clearTimeout(restartListeningTimerRef.current)
    }
  }

  const speakText = (text: string) => {
    if (!synthRef.current || !voicesReady || !text) {
      console.log("Cannot speak:", { synthRef: !!synthRef.current, voicesReady, hasText: !!text })
      return
    }

    console.log("Speaking text:", text)

    // Cancel any ongoing speech
    if (synthRef.current.speaking) {
      synthRef.current.cancel()
    }

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)

      // Voice settings for American accent
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0
      utterance.lang = "en-US"

      // Find the best American voice
      const voices = synthRef.current!.getVoices()
      console.log("Looking for American voice among:", voices.length, "voices")

      const americanVoice =
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("google")) ??
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("microsoft")) ??
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("samantha")) ??
        voices.find((v) => v.lang === "en-US" && v.name.toLowerCase().includes("alex")) ??
        voices.find((v) => v.lang === "en-US") ??
        voices.find((v) => v.lang.startsWith("en")) ??
        voices[0]

      if (americanVoice) {
        utterance.voice = americanVoice
        console.log("Using voice:", americanVoice.name, americanVoice.lang)
      }

      utterance.onstart = () => {
        console.log("Speech synthesis started")
        setIsSpeaking(true)
        stopListening()
      }

      utterance.onend = () => {
        console.log("Speech synthesis ended")
        setIsSpeaking(false)

        // Start listening after AI finishes speaking
        if (isConversationActive) {
          setTimeout(() => {
            if (isConversationActive && !recognitionActiveRef.current) {
              console.log("Starting to listen after AI speech...")
              startListening()
            }
          }, 500)
        }
      }

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event)
        setIsSpeaking(false)

        // Still try to start listening even if speech failed
        if (isConversationActive) {
          setTimeout(() => {
            if (isConversationActive && !recognitionActiveRef.current) {
              startListening()
            }
          }, 500)
        }
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
    // Send the voice input to the AI
    append({
      role: "user",
      content: text,
    })

    // Clear transcripts after processing
    setCurrentTranscript("")
    setInterimTranscript("")
  }

  const handleEmailSubmit = () => {
    if (customerEmail.trim()) {
      setShowEmailPopup(false)
      // Send complaint data with email
      sendComplaintData()

      // Continue conversation
      append({
        role: "user",
        content: `My email is ${customerEmail}`,
      })
    }
  }

  const sendComplaintData = async () => {
    try {
      const complaintPayload = {
        conversation: messages,
        complaintData: complaintData,
        customerEmail: customerEmail,
        timestamp: new Date().toISOString(),
        conversationDuration: messages.length,
      }

      await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(complaintPayload),
      })
      console.log("Complaint data sent successfully")
    } catch (error) {
      console.error("Error sending complaint:", error)
    }
  }

  // Get current status for display
  const getConversationStatus = () => {
    if (!isConversationActive) return "Ready to start"
    if (isSpeaking) return "AURA speaking..."
    if (isListening) return "Listening..."
    if (isLoading) return "AURA thinking..."
    return "Conversation active"
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
              Please provide your email address so our team can follow up on your complaint.
            </p>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
              autoFocus
            />
            <Button
              onClick={handleEmailSubmit}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              disabled={!customerEmail.trim()}
            >
              Submit Email
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
            <div className="flex justify-center">
              <Button
                onClick={isConversationActive ? endConversation : startConversation}
                size="lg"
                className={`w-24 h-24 rounded-full shadow-2xl transition-all duration-300 ${
                  isConversationActive ? "bg-red-500 hover:bg-red-600 scale-110" : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isConversationActive ? (
                  <PhoneOff className="h-10 w-10 text-white" />
                ) : (
                  <Phone className="h-10 w-10 text-white" />
                )}
              </Button>
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
            {!isConversationActive && (
              <div className="text-center text-white/60 text-sm px-4">
                <p>Tap the green button to start talking with AURA</p>
                <p className="mt-2">I'm here to help with your service complaints</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
