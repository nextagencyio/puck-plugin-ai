import type { Data } from '@puckeditor/core'

// ── Client-side types ──

export type Suggestion = {
  label: string
  prompt: string
}

export type AiChatPluginOptions = {
  /** API endpoint for AI generation. Default: '/api/ai/generate' */
  endpoint?: string
  /** Suggestion prompts shown in the empty state. */
  suggestions?: Suggestion[]
  /** Callback after content is generated and applied. */
  onGenerate?: (data: Data) => void
}

export type Message = {
  role: 'user' | 'assistant'
  content: string
}

// ── Server-side types ──

export type GenerateOptions = {
  /** User prompt. */
  prompt: string
  /** Current page data from the Puck editor. */
  currentData?: Data
  /** Documentation string describing available components and their fields. */
  componentDocs: string
  /** Groq API key. Falls back to GROQ_API_KEY env var. */
  groqApiKey?: string
  /** Groq model name. Default: 'llama-3.3-70b-versatile' */
  groqModel?: string
  /** Max completion tokens. Default: 8192 */
  maxTokens?: number
  /** Unsplash access key for fetching real images. Optional. */
  unsplashAccessKey?: string
  /** Extra instructions appended to the system prompt. */
  extraInstructions?: string
  /** Full example section JSON for the prompt (improves output quality). */
  exampleSection?: string
  /** Full example page JSON for the prompt (improves output quality). */
  examplePage?: string
}

export type GenerateResult = {
  /** The generated/updated Puck page data. */
  puckData?: Data
  /** Human-readable message about what was done. */
  message: string
  /** LLM token usage stats. */
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  /** Error message if generation failed. */
  error?: string
}
