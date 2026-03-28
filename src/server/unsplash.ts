/**
 * Fetch a real image URL from Unsplash for a search query.
 */
export async function getUnsplashImage(
  query: string,
  accessKey: string,
  width = 800,
  height = 600
): Promise<string | null> {
  if (!accessKey) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&w=${width}&h=${height}`,
      { headers: { 'Authorization': `Client-ID ${accessKey}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.urls?.regular || data.urls?.small || null
  } catch {
    return null
  }
}

/**
 * Check if a URL is a real, loadable image (not example.com/fake.jpg).
 */
export function isRealImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  if (url.includes('example.com')) return false
  if (url.includes('placeholder')) return false
  if (!url.startsWith('http')) return false
  const realHosts = [
    'unsplash.com', 'images.unsplash.com',
    'cloudinary.com', 'res.cloudinary.com',
    'imgur.com', 'pexels.com', 'images.pexels.com',
  ]
  try {
    const hostname = new URL(url).hostname
    return realHosts.some(h => hostname.includes(h))
  } catch {
    return false
  }
}
