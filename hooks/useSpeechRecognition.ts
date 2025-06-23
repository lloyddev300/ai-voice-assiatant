"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void
  onError?: (error: string) => void
}

// Define SpeechRecognition and SpeechRecognitionEvent types
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
  interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    onstart: () => void
    onresult: (event: SpeechRecognitionEvent) => void
    onerror: (event: SpeechRecognitionErrorEvent) => void
    onend: () => void
    start: () => void
    stop: () => void
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList
    resultIndex: number
  }

  interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult
    length: number
  }

  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative
    isFinal: boolean
    length: number
  }

  interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: SpeechRecognitionErrorCode
  }

  type SpeechRecognitionErrorCode =
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported"
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isActiveRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const initRecognition = async () => {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
          onError?.("Speech recognition not supported")
          return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onstart = () => {
          console.log("Speech recognition started")
          setIsListening(true)
          isActiveRef.current = true
        }

        recognition.onresult = (event) => {
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
            const fullTranscript = (currentTranscript + finalTranscript).trim()
            setCurrentTranscript(fullTranscript)
            onResult(fullTranscript)
          }
        }

        recognition.onerror = (event) => {
          if (event.error === "no-speech") return
          console.error("Speech recognition error:", event.error)
          onError?.(event.error)
          setIsListening(false)
          isActiveRef.current = false
        }

        recognition.onend = () => {
          console.log("Speech recognition ended")
          setIsListening(false)
          isActiveRef.current = false
          setInterimTranscript("")
        }

        recognitionRef.current = recognition
      } catch (error) {
        console.error("Failed to initialize speech recognition:", error)
        onError?.("Microphone permission denied")
      }
    }

    initRecognition()
  }, [onResult, onError])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isActiveRef.current) return

    try {
      setCurrentTranscript("")
      setInterimTranscript("")
      recognitionRef.current.start()
    } catch (error) {
      console.error("Failed to start listening:", error)
      onError?.("Failed to start listening")
    }
  }, [onError])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isActiveRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return {
    isListening,
    currentTranscript,
    interimTranscript,
    startListening,
    stopListening,
  }
}
