import type { GenerateOptions, GenerateResult } from '../types'
import { sanitizeContent } from './sanitizer'

const DEFAULT_EXAMPLE_SECTION = JSON.stringify([
  {
    type: 'Testimonials',
    props: {
      id: 'Testimonials-1',
      eyebrow: 'Testimonials',
      title: 'What our customers say',
      layout: 'grid',
      testimonials: [
        { quote: 'This product changed everything for us.', authorName: 'Sarah Chen', authorTitle: 'CTO', authorCompany: 'TechFlow', rating: '5' },
        { quote: 'Best decision we ever made.', authorName: 'Marcus Johnson', authorTitle: 'Lead Developer', authorCompany: 'Quantum Labs', rating: '5' },
      ],
    },
  },
], null, 2)

const DEFAULT_EXAMPLE_PAGE = JSON.stringify({
  content: [
    { type: 'Hero', props: { id: 'Hero-1', eyebrow: 'Welcome', title: 'Build Something Amazing', subtitle: 'The platform that helps you ship faster.', layout: 'centered', backgroundColor: 'gradient', primaryCtaText: 'Get Started', primaryCtaUrl: '/signup' } },
    { type: 'CardGroup', props: { id: 'CardGroup-1', eyebrow: 'Features', title: 'Why Choose Us', columns: '3', cards: [{ icon: 'Zap', title: 'Fast', description: 'Blazing speed.' }, { icon: 'Shield', title: 'Secure', description: 'Enterprise security.' }] } },
    { type: 'Pricing', props: { id: 'Pricing-1', eyebrow: 'Pricing', title: 'Simple Pricing', subtitle: 'No hidden fees.', tiers: [{ name: 'Free', price: '$0', billingPeriod: 'forever', description: 'For individuals', isFeatured: false, ctaText: 'Start Free', ctaUrl: '/signup' }, { name: 'Pro', price: '$29', billingPeriod: '/month', description: 'For teams', isFeatured: true, ctaText: 'Start Trial', ctaUrl: '/signup' }, { name: 'Enterprise', price: 'Custom', billingPeriod: '', description: 'For large orgs', isFeatured: false, ctaText: 'Contact Sales', ctaUrl: '/contact' }] } },
    { type: 'Newsletter', props: { id: 'Newsletter-1', title: 'Stay Updated', subtitle: 'Get the latest updates.', placeholder: 'Enter your email', buttonText: 'Subscribe', backgroundColor: 'dark' } },
  ],
  root: { props: { title: 'My Landing Page' } },
  zones: {},
}, null, 2)

function buildSystemPrompt(options: GenerateOptions): string {
  const exampleSection = options.exampleSection || DEFAULT_EXAMPLE_SECTION
  const examplePage = options.examplePage || DEFAULT_EXAMPLE_PAGE
  const extraInstructions = options.extraInstructions ? `\n\n## Additional Instructions\n\n${options.extraInstructions}` : ''

  return `You are a landing page builder AI. You generate Puck editor page data as JSON.

## Available Components

${options.componentDocs}

## How to Respond

You will receive a user prompt and the current page data. Choose ONE action:

**"add"** — User wants to ADD new section(s). Return ONLY the new sections. Do NOT include existing sections.
Example:
{"action": "add", "sections": ${exampleSection}}

**"update"** — User wants to MODIFY an existing section (rewrite copy, change colors, etc.). Return the updated section with its SAME id.
Example:
{"action": "update", "sections": [{"type": "Hero", "props": {"id": "Hero-abc12345", "title": "New Better Title", "subtitle": "Updated subtitle", "layout": "centered", "backgroundColor": "gradient"}}]}

**"create"** — User wants a full page from scratch, OR the page is empty. Return a complete page.
Example:
{"action": "create", "data": ${examplePage}}

## IMPORTANT — Choosing the Right Action

- **"update"** when the user wants to CHANGE something that already exists on the page:
  - "Add a testimonial to the testimonials section" → UPDATE (modifying existing section's array)
  - "Add a card to the features" → UPDATE (modifying existing section's array)
  - "Change the hero title" → UPDATE
  - "Add a third pricing tier" → UPDATE (modifying existing pricing section)
  - "Rewrite the FAQ answers" → UPDATE

- **"add"** ONLY when the user wants a completely NEW section type that doesn't exist yet:
  - "Add a pricing section" (when no pricing exists) → ADD
  - "Add a newsletter" (when no newsletter exists) → ADD

- **"create"** ONLY when the page is empty or user explicitly says "create a new page" / "start over"

- For "update": return the FULL updated section with ALL its existing content PLUS the changes. Keep the SAME id. Include ALL existing array items plus any new ones.
- For "add": return ONLY the new section(s). Never duplicate existing sections.
- When in doubt, choose "update" over "add".

## Rules

1. Return ONLY valid JSON — no markdown, no explanation, no code fences.
2. Each component must have: {"type": "ComponentName", "props": {"id": "ComponentName-N", ...fields}}
3. Write compelling, professional marketing copy — not placeholder text.
4. For array fields (cards, items, tiers, etc.), include 2-4 realistic items.
5. The "id" must be unique for new sections (e.g., "Hero-1", "CardGroup-2"). For updates, keep the original id.
6. For image fields: set the value to a SHORT search term describing the image (e.g., "modern office workspace", "coffee shop interior"). Do NOT use URLs.
7. For icon fields in cards/features: use Lucide icon names like Zap, Shield, Blocks, Code, Rocket, Lock, Cloud, Database, Users, Star, Heart, Globe, Mail, Phone.
8. For rating fields in testimonials: use a single number like "5", not "5/5".
9. For pricing tiers: "price" should be ONLY the dollar amount like "$0", "$29", "$99", or "Custom". Never include the billing period in the price (no "$29/month"). Put the billing period in "billingPeriod" instead (e.g., "/month", "/year", "forever").${extraInstructions}`
}

/**
 * Generate Puck page content using Groq LLM.
 *
 * This is framework-agnostic — returns a result object that the consumer
 * wraps in their framework's response format (Next.js Response, etc.).
 *
 * @example
 * ```typescript
 * import { generatePuckContent } from '@decoupled/puck-plugin-ai/server'
 *
 * const result = await generatePuckContent({
 *   prompt: 'Create a landing page for a coffee shop',
 *   componentDocs: myComponentDocs,
 *   groqApiKey: process.env.GROQ_API_KEY,
 * })
 *
 * return Response.json(result)
 * ```
 */
export async function generatePuckContent(options: GenerateOptions): Promise<GenerateResult> {
  const {
    prompt,
    currentData,
    groqApiKey,
    groqModel = 'llama-3.3-70b-versatile',
    maxTokens = 8192,
    unsplashAccessKey,
  } = options

  const apiKey = groqApiKey || process.env.GROQ_API_KEY
  if (!apiKey) {
    return { message: 'GROQ_API_KEY not configured', error: 'Missing API key' }
  }

  // Dynamic import to avoid requiring groq-sdk at the package level.
  const { default: Groq } = await import('groq-sdk')
  const groq = new Groq({ apiKey })

  // Build user prompt with page context.
  let userPrompt = prompt
  if (currentData?.content?.length) {
    const compactData = currentData.content.map((c: any) => ({
      type: c.type,
      props: c.props,
    }))
    userPrompt += `\n\nCurrent page data:\n${JSON.stringify(compactData, null, 2)}`
  } else {
    userPrompt += '\n\nThe page is currently empty.'
  }

  try {
    const completion = await groq.chat.completions.create({
      model: groqModel,
      messages: [
        { role: 'system', content: buildSystemPrompt(options) },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_completion_tokens: maxTokens,
      response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content || ''

    let parsed: any
    try {
      parsed = JSON.parse(responseText)
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        return { message: 'Could not parse AI response.', error: 'Invalid JSON' }
      }
    }

    let puckData: any

    if (parsed.action === 'add' && parsed.sections) {
      const existing = currentData || { content: [], root: { props: { title: '' } }, zones: {} }
      const sanitized = await sanitizeContent(parsed.sections, unsplashAccessKey)
      puckData = {
        ...existing,
        content: [...(existing.content || []), ...sanitized],
      }
      const count = parsed.sections.length
      return {
        puckData,
        message: `Added ${count} section${count > 1 ? 's' : ''} to the page.`,
        usage: completion.usage as any,
      }
    }

    if (parsed.action === 'update' && parsed.sections) {
      const existing = currentData || { content: [], root: { props: { title: '' } }, zones: {} }
      const sanitized = await sanitizeContent(parsed.sections, unsplashAccessKey)
      const updatedIds = new Set(sanitized.map((s: any) => s.props?.id))
      const updatedContent = existing.content.map((c: any) => {
        if (updatedIds.has(c.props?.id)) {
          return sanitized.find((s: any) => s.props?.id === c.props?.id) || c
        }
        return c
      })
      puckData = { ...existing, content: updatedContent }
      const count = parsed.sections.length
      return {
        puckData,
        message: `Updated ${count} section${count > 1 ? 's' : ''}.`,
        usage: completion.usage as any,
      }
    }

    if ((parsed.action === 'replace' || parsed.action === 'create') && parsed.data) {
      puckData = parsed.data
      if (!puckData.zones) puckData.zones = {}
      puckData.content = await sanitizeContent(puckData.content || [], unsplashAccessKey)
    } else if (parsed.content) {
      puckData = parsed
      if (!puckData.zones) puckData.zones = {}
      puckData.content = await sanitizeContent(puckData.content || [], unsplashAccessKey)
    } else {
      return { message: 'Unexpected AI response format.', error: 'Invalid structure' }
    }

    return {
      puckData,
      message: `Generated ${puckData.content?.length || 0} sections.`,
      usage: completion.usage as any,
    }
  } catch (error: any) {
    return { message: 'AI generation failed.', error: error.message }
  }
}
