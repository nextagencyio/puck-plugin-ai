# @decoupled/puck-plugin-ai

AI chat plugin for [Puck Editor](https://puckeditor.com) — a drop-in replacement for `@puckeditor/plugin-ai` that uses **Groq/Llama** instead of Puck Cloud.

Generate and modify landing pages with natural language. The plugin adds a chat panel to the Puck sidebar where users can describe what they want and the AI builds it using your component library.

## Features

- **Drop-in replacement** — Same plugin API as `@puckeditor/plugin-ai`
- **Groq + Llama** — Fast, free inference (no Puck Cloud subscription)
- **Smart actions** — Add sections, update existing content, or create full pages
- **Unsplash integration** — AI generates image search terms, plugin fetches real photos
- **Configurable** — Custom suggestions, endpoint, model, and system prompt
- **Framework-agnostic server** — Works with Next.js, Remix, Hono, or any Node server

## Quick Start

### 1. Install

```bash
npm install @decoupled/puck-plugin-ai groq-sdk
```

### 2. Add the plugin to your editor

```tsx
import { Puck } from '@puckeditor/core'
import { createAiChatPlugin } from '@decoupled/puck-plugin-ai'

const aiPlugin = createAiChatPlugin({
  endpoint: '/api/ai/generate',
})

export function Editor() {
  return (
    <Puck
      config={config}
      data={data}
      onPublish={handlePublish}
      plugins={[aiPlugin]}
    />
  )
}
```

### 3. Create the API route

```typescript
// app/api/ai/generate/route.ts (Next.js)
import { generatePuckContent } from '@decoupled/puck-plugin-ai/server'

const COMPONENT_DOCS = `
  Hero:
    title (string, required): Main heading
    subtitle (text): Supporting text
    backgroundColor (select: light|dark|gradient): Background style
  CardGroup:
    title (string): Section heading
    cards (array of { icon, title, description }): Feature cards
`

export async function POST(request: Request) {
  const { prompt, currentData } = await request.json()

  const result = await generatePuckContent({
    prompt,
    currentData,
    componentDocs: COMPONENT_DOCS,
    groqApiKey: process.env.GROQ_API_KEY,
  })

  return Response.json(result)
}
```

### 4. Set environment variables

```env
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile     # optional
GROQ_MAX_TOKENS=8192                    # optional
UNSPLASH_ACCESS_KEY=your-unsplash-key   # optional, for real images
```

## Client API

### `createAiChatPlugin(options?)`

Creates a Puck plugin that adds an AI chat panel to the editor sidebar.

```typescript
type AiChatPluginOptions = {
  /** API endpoint for AI generation. Default: '/api/ai/generate' */
  endpoint?: string
  /** Suggestion prompts shown in the empty state. */
  suggestions?: Array<{ label: string; prompt: string }>
  /** Callback after content is generated and applied. */
  onGenerate?: (data: Data) => void
}
```

### `AiChatPanel`

The chat panel React component, exported for advanced customization:

```tsx
import { AiChatPanel } from '@decoupled/puck-plugin-ai'

// Use inside a custom plugin
const myPlugin = {
  name: 'my-ai',
  render: () => <AiChatPanel endpoint="/api/ai" suggestions={[...]} />,
  icon: <MyIcon />,
}
```

## Server API

### `generatePuckContent(options)`

Generates Puck page data using Groq. Returns a result object (not a Response — wrap it yourself).

```typescript
type GenerateOptions = {
  prompt: string
  currentData?: Data
  componentDocs: string          // Required: describe your components
  groqApiKey?: string            // Falls back to GROQ_API_KEY env var
  groqModel?: string             // Default: 'llama-3.3-70b-versatile'
  maxTokens?: number             // Default: 8192
  unsplashAccessKey?: string     // Optional: for real images
  extraInstructions?: string     // Appended to system prompt
  exampleSection?: string        // JSON example of a section
  examplePage?: string           // JSON example of a full page
}

type GenerateResult = {
  puckData?: Data
  message: string
  usage?: { prompt_tokens, completion_tokens, total_tokens }
  error?: string
}
```

### Utilities

```typescript
import { sanitizeContent, camelCaseKeys } from '@decoupled/puck-plugin-ai/server'
import { getUnsplashImage, isRealImageUrl } from '@decoupled/puck-plugin-ai/server'
```

## How It Works

1. User types a prompt in the chat panel
2. Plugin sends `{ prompt, currentData }` to your API endpoint
3. Server builds a system prompt with your component docs
4. Groq generates a JSON response with `action: "add" | "update" | "create"`
5. Server sanitizes the response (camelCase keys, Unsplash images, rating fixes)
6. Plugin dispatches `setData` to update the Puck canvas

### Smart Actions

The AI chooses the right action based on the prompt:

| User Says | Action | Behavior |
|-----------|--------|----------|
| "Create a landing page" | `create` | Full page replacement |
| "Add a pricing section" | `add` | Appends to existing page |
| "Rewrite the hero copy" | `update` | Modifies specific section by id |

## Supported Models

Any model available on [Groq](https://console.groq.com/docs/models):

- `llama-3.3-70b-versatile` (default, recommended)
- `llama-3.1-8b-instant` (faster, less capable)
- `mixtral-8x7b-32768`
- `meta-llama/llama-4-scout-17b-16e-instruct`

## License

MIT
