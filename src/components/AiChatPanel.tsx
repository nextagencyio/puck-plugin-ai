'use client'

import { useState, useRef, useEffect } from 'react'
import { usePuck, type Data } from '@puckeditor/core'
import type { Message, Suggestion } from '../types'

interface AiChatPanelProps {
  endpoint: string
  suggestions: Suggestion[]
  onGenerate?: (data: Data) => void
}

export function AiChatPanel({ endpoint, suggestions, onGenerate }: AiChatPanelProps) {
  const { dispatch, appState } = usePuck()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasMessages = messages.length > 0

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSubmit = async (prompt?: string) => {
    const userMessage = (prompt || input).trim()
    if (!userMessage || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          currentData: appState.data,
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(data.error || `Failed (${res.status})`)
      }

      const data = await res.json()

      if (data.puckData) {
        // Deep sanitize — ensure every prop value is defined.
        const sanitized = {
          ...data.puckData,
          content: (data.puckData.content || []).map((c: any) => ({
            ...c,
            props: Object.fromEntries(
              Object.entries(c.props || {}).map(([k, v]) => [
                k,
                v === undefined || v === null ? '' :
                Array.isArray(v) ? v.map((item: any) =>
                  typeof item === 'object' && item !== null
                    ? Object.fromEntries(Object.entries(item).map(([ik, iv]) => [ik, iv ?? '']))
                    : item ?? ''
                ) : v,
              ])
            ),
          })),
          root: data.puckData.root || { props: {} },
          zones: data.puckData.zones || {},
        }
        dispatch({ type: 'setData', data: sanitized })
        onGenerate?.(sanitized)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message || `Updated the page with ${sanitized.content?.length || 0} sections.`,
        }])
      } else if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch (err: any) {
      setError(err.message)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div style={{
      background: 'white',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      textAlign: 'left',
      fontFamily: 'var(--puck-font-family)',
    }}>
      {/* Header with New Chat button */}
      {hasMessages && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--puck-color-grey-09)',
        }}>
          <span style={{
            fontSize: 'var(--puck-font-size-xxxs)',
            fontWeight: 600,
            color: 'var(--puck-color-grey-03)',
          }}>
            AI Chat
          </span>
          <button
            onClick={() => { setMessages([]); setError(null) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              fontSize: '11px',
              border: '1px solid var(--puck-color-grey-08)',
              borderRadius: '6px',
              background: 'white',
              color: 'var(--puck-color-grey-04)',
              cursor: 'pointer',
              fontFamily: 'var(--puck-font-family)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          ...(hasMessages ? { padding: '16px' } : {}),
        }}
      >
        {/* Empty state */}
        {!hasMessages && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '32px',
            gap: '8px',
            color: 'var(--puck-color-grey-06)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
            <div style={{
              fontSize: 'var(--puck-font-size-xs)',
              fontWeight: 600,
              color: 'var(--puck-color-grey-03)',
              marginTop: '8px',
            }}>
              AI Page Builder
            </div>
            <div style={{
              fontSize: 'var(--puck-font-size-xxxs)',
              lineHeight: 'var(--line-height-l)',
              maxWidth: '240px',
            }}>
              Describe what you want to build and I'll generate the page for you.
            </div>
            <div style={{
              display: 'flex',
              gap: '6px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '4px',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(s.prompt)}
                  style={{
                    border: '1px solid var(--puck-color-azure-04)',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: i === 0 ? 'var(--puck-color-azure-04)' : 'transparent',
                    color: i === 0 ? 'white' : 'var(--puck-color-azure-04)',
                    fontFamily: 'var(--puck-font-family)',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              fontSize: 'var(--puck-font-size-xs)',
              lineHeight: 'var(--line-height-s)',
              overflowWrap: 'break-word',
              marginBottom: '8px',
            }}
          >
            {msg.role === 'user' ? (
              <div style={{
                background: 'var(--puck-color-azure-10)',
                borderRadius: '16px',
                color: 'var(--puck-color-grey-03)',
                marginLeft: '24px',
                padding: '12px 16px',
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                color: 'var(--puck-color-grey-03)',
                padding: '12px 0',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            fontSize: 'var(--puck-font-size-xs)',
            color: 'var(--puck-color-grey-06)',
            padding: '12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--puck-color-azure-04)',
              animation: 'puck-ai-pulse 1s ease-in-out infinite',
            }} />
            Generating content...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        ...(hasMessages ? { borderTop: '1px solid var(--puck-color-grey-09)' } : {}),
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Describe what to build..."
            rows={1}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: 'var(--puck-font-size-xxxs)',
              fontFamily: 'var(--puck-font-family)',
              border: '1px solid var(--puck-color-grey-08)',
              borderRadius: '8px',
              resize: 'none',
              outline: 'none',
              lineHeight: 'var(--line-height-l)',
              minHeight: '40px',
              maxHeight: '120px',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--puck-color-azure-05)'}
            onBlur={e => e.target.style.borderColor = 'var(--puck-color-grey-08)'}
            disabled={loading}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !input.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              border: 'none',
              borderRadius: '8px',
              background: loading || !input.trim() ? 'var(--puck-color-grey-09)' : 'var(--puck-color-azure-04)',
              color: 'white',
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--puck-color-red-04)' }}>
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes puck-ai-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
