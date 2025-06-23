"use client"

import { useState, useCallback } from "react"
import type { ConversationStep, ComplaintData } from "@/types/conversation"

const CONVERSATION_STEPS: ConversationStep[] = [
  { id: 1, name: "Welcome", description: "Initial greeting", completed: false },
  { id: 2, name: "Complaint", description: "Capture main issue", completed: false },
  { id: 3, name: "Empathy", description: "Show understanding", completed: false },
  { id: 4, name: "Details", description: "Gather specifics", completed: false },
  { id: 5, name: "Email", description: "Collect contact info", completed: false },
]

export function useConversationFlow() {
  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState(CONVERSATION_STEPS)
  const [complaintData, setComplaintData] = useState<ComplaintData>({
    complaint: "",
    timing: "",
    details: "",
    email: "",
    conversationHistory: [],
  })

  const updateStep = useCallback((stepId: number) => {
    setCurrentStep(stepId)
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        completed: step.id < stepId,
      })),
    )
  }, [])

  const addToHistory = useCallback((speaker: string, message: string) => {
    setComplaintData((prev) => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, `${speaker}: ${message}`],
    }))
  }, [])

  const updateComplaintData = useCallback((field: keyof ComplaintData, value: string) => {
    setComplaintData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  const reset = useCallback(() => {
    setCurrentStep(1)
    setSteps(CONVERSATION_STEPS.map((step) => ({ ...step, completed: false })))
    setComplaintData({
      complaint: "",
      timing: "",
      details: "",
      email: "",
      conversationHistory: [],
    })
  }, [])

  return {
    currentStep,
    steps,
    complaintData,
    updateStep,
    addToHistory,
    updateComplaintData,
    reset,
  }
}
