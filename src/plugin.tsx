'use client'

import React from 'react'
import { AiChatPanel } from './components/AiChatPanel'
import type { AiChatPluginOptions, Suggestion } from './types'

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: 'Create a SaaS landing page', prompt: 'Create a complete landing page for a SaaS product with hero, features, pricing, testimonials, FAQ, and newsletter sections' },
  { label: 'Add pricing section', prompt: 'Add a pricing section with 3 tiers: Free, Pro, and Enterprise' },
  { label: 'Add testimonials', prompt: 'Add a testimonials section with 3 customer quotes' },
  { label: 'Rewrite hero copy', prompt: 'Rewrite the hero section with more compelling, conversion-focused copy' },
]

/**
 * Create a Puck plugin that adds an AI chat panel to the editor sidebar.
 *
 * This is a drop-in replacement for @puckeditor/plugin-ai that uses
 * Groq/Llama instead of Puck Cloud.
 *
 * @example
 * ```tsx
 * import { createAiChatPlugin } from '@decoupled/puck-plugin-ai'
 *
 * const aiPlugin = createAiChatPlugin({
 *   endpoint: '/api/ai/generate',
 *   suggestions: [
 *     { label: 'Create landing page', prompt: 'Create a SaaS landing page...' },
 *   ],
 * })
 *
 * <Puck plugins={[aiPlugin]} config={config} ... />
 * ```
 */
export function createAiChatPlugin(options: AiChatPluginOptions = {}) {
  const {
    endpoint = '/api/ai/generate',
    suggestions = DEFAULT_SUGGESTIONS,
    onGenerate,
  } = options

  return {
    label: 'AI',
    name: 'ai-chat',
    render: () => (
      <AiChatPanel
        endpoint={endpoint}
        suggestions={suggestions}
        onGenerate={onGenerate}
      />
    ),
    icon: (
      <svg style={{ display: 'block', margin: '0 auto' }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
    overrides: {},
  }
}
