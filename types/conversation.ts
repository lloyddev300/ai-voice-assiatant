export interface ConversationStep {
  id: number
  name: string
  description: string
  completed: boolean
}

export interface ComplaintData {
  complaint: string
  timing: string
  details: string
  email: string
  conversationHistory: string[]
}

export interface VoiceState {
  isListening: boolean
  isSpeaking: boolean
  isActive: boolean
  currentTranscript: string
  interimTranscript: string
}
