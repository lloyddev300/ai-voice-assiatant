"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react"
import { useChat } from "ai/react"

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

export default function VoiceComplaintAgent() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content: "Hello! I'm here to help you with your service complaint. How can I assist you today?",
      },
    ],
    onFinish: (message) => {
      speakText(message.content)

      // Send complaint data to webhook after conversation
      if (messages.length > 4) {
        // After some back and forth
        sendComplaintData()
      }
    },
  })

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event: any) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
          handleVoiceInput(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    // Initialize speech synthesis
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speakText = (text: string) => {
    if (synthRef.current && text) {
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      synthRef.current.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const handleVoiceInput = (text: string) => {
    const syntheticEvent = {
      preventDefault: () => {},
      target: { value: text },
    } as any

    handleInputChange(syntheticEvent)

    setTimeout(() => {
      handleSubmit(syntheticEvent)
    }, 500)
  }

  const sendComplaintData = async () => {
    try {
      await fetch("/api/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: messages,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error("Error sending complaint:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 p-4 flex items-center justify-center">
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
            <h1 className="text-white text-lg font-medium mb-2">Hello Jenny,</h1>
            <p className="text-white/80 text-sm">How can I help you today?</p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <div className="text-white text-4xl">😊</div>
                {(isListening || isSpeaking) && (
                  <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-pulse"></div>
                )}
              </div>
              {isListening && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto">
            <div className="space-y-3">
              {messages.slice(-3).map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-3 py-2 rounded-2xl">
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
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Voice Controls */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={isListening ? stopListening : startListening}
                size="lg"
                className={`w-16 h-16 rounded-full ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
                }`}
                disabled={isSpeaking}
              >
                {isListening ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
              </Button>

              <Button
                onClick={isSpeaking ? stopSpeaking : () => {}}
                size="lg"
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30"
                disabled={!isSpeaking}
              >
                {isSpeaking ? (
                  <VolumeX className="h-6 w-6 text-white" />
                ) : (
                  <Volume2 className="h-6 w-6 text-white/60" />
                )}
              </Button>
            </div>

            {/* Text Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                size="lg"
                className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>

            {/* Status Indicators */}
            <div className="flex justify-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isListening ? "bg-red-400" : "bg-white/30"}`}></div>
                <span>Listening</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-blue-400" : "bg-white/30"}`}></div>
                <span>Speaking</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${messages.length > 1 ? "bg-green-400" : "bg-white/30"}`}></div>
                <span>Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
