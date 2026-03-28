import { isRealImageUrl, getUnsplashImage } from './unsplash'

/**
 * Convert a snake_case string to camelCase.
 */
export function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Convert all keys in an object from snake_case to camelCase, recursively.
 */
export function camelCaseKeys(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key)
    if (Array.isArray(value)) {
      result[camelKey] = value.map((item: any) =>
        typeof item === 'object' && item !== null ? camelCaseKeys(item) : item
      )
    } else if (value === undefined || value === null) {
      result[camelKey] = ''
    } else {
      result[camelKey] = value
    }
  }
  return result
}

/** Known image prop names (camelCase). */
const IMAGE_PROPS = new Set(['backgroundImage', 'image', 'authorImage', 'authorImageUrl'])

/**
 * Sanitize a single image value — replace fake URLs with Unsplash or empty string.
 */
async function sanitizeImageValue(value: string, unsplashAccessKey?: string): Promise<string> {
  if (!value || typeof value !== 'string') return ''
  if (isRealImageUrl(value)) return value
  if (value.startsWith('http')) return ''
  // It's a search term — try Unsplash.
  if (unsplashAccessKey) {
    const url = await getUnsplashImage(value, unsplashAccessKey)
    return url || ''
  }
  return ''
}

/**
 * Sanitize an array of Puck component data:
 * - Convert snake_case keys to camelCase
 * - Ensure all props have values (no undefined/null)
 * - Generate missing ids
 * - Replace fake image URLs with Unsplash images (if key provided)
 * - Fix rating format ("5/5" → "5")
 */
export async function sanitizeContent(
  content: any[],
  unsplashAccessKey?: string
): Promise<any[]> {
  return Promise.all(content.map(async (component) => {
    if (!component.props) component.props = {}
    component.props = camelCaseKeys(component.props)

    if (!component.props.id) {
      component.props.id = `${component.type}-${Math.random().toString(36).slice(2, 10)}`
    }

    // Process image props at top level.
    for (const key of Object.keys(component.props)) {
      if (IMAGE_PROPS.has(key)) {
        component.props[key] = await sanitizeImageValue(component.props[key], unsplashAccessKey)
      }
    }

    // Process nested arrays (cards, testimonials, etc.).
    for (const [key, value] of Object.entries(component.props)) {
      if (Array.isArray(value)) {
        component.props[key] = await Promise.all(
          value.map(async (item: any) => {
            if (typeof item === 'object' && item !== null) {
              for (const ik of Object.keys(item)) {
                if (IMAGE_PROPS.has(ik)) {
                  item[ik] = await sanitizeImageValue(item[ik], unsplashAccessKey)
                }
                if (ik === 'rating' && typeof item[ik] === 'string') {
                  item[ik] = item[ik].split('/')[0].trim()
                }
              }
            }
            return item
          })
        )
      }
    }

    return component
  }))
}
