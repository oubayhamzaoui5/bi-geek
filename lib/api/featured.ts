// lib/api/featured.ts
export type FeaturedItem = {
  id?: string
  itemId: string
  type: 'course' | 'bootcamp'
  order: number
}

export async function getFeaturedItems(): Promise<FeaturedItem[]> {
  try {
    const response = await fetch('/api/admin/featured', {
      cache: 'no-store'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch featured items')
    }
    
    const data = await response.json()
    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch featured items')
    }
    
    return data.featuredItems || []
  } catch (error) {
    console.error('Error fetching featured items:', error)
    return []
  }
}

export async function saveFeaturedItems(items: FeaturedItem[]): Promise<void> {
  try {
    const response = await fetch('/api/admin/featured', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save featured items')
    }
  } catch (error) {
    console.error('Error saving featured items:', error)
    throw error
  }
}