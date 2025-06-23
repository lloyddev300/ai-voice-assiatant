"use client"

import type { ConversationStep } from "@/types/conversation"

interface ConversationProgressProps {
  steps: ConversationStep[]
  currentStep: number
}

export function ConversationProgress({ steps, currentStep }: ConversationProgressProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 mb-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-gray-600">Conversation Progress</p>
        <p className="text-xs text-gray-500">{currentStep}/5</p>
      </div>

      <div className="flex gap-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
              step.id <= currentStep ? "bg-purple-500" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        {steps.map((step) => (
          <span key={step.id}>{step.name}</span>
        ))}
      </div>
    </div>
  )
}
