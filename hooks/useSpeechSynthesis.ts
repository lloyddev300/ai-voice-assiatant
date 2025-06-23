"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)

  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    synthRef.current = window.speechSynthesis

    const loadVoices = () => {
      setVoicesReady(true)
    }

    if (window.speechSynthesis.getVoices().length > 0) {
      loadVoices()
    }

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices)
    setTimeout(loadVoices, 1000) // Fallback

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices)
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current || !voicesReady || !text) {
        console.warn("Cannot speak:", { synthRef: !!synthRef.current, voicesReady, hasText: !!text })
        return
      }

      // Cancel any ongoing speech
      if (synthRef.current.speaking) {
        synthRef.current.cancel()
      }

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1.0
        utterance.volume = 1.0
        utterance.lang = "en-US"

        // Select American English voice
        const voices = synthRef.current!.getVoices()
        const americanVoice = voices.find((v) => v.lang === "en-US") || voices[0]
        if (americanVoice) utterance.voice = americanVoice

        utterance.onstart = () => {
          console.log("Speech started:", text)
          setIsSpeaking(true)
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
    },
    [voicesReady],
  )

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }, [])

  return {
    isSpeaking,
    voicesReady,
    speak,
    stop,
  }
}
