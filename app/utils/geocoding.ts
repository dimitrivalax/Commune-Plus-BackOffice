/**
 * Géocodage inverse (coordonnées → adresse)
 * API data.gouv.fr (même service que Commune-Plus-Mobile)
 */

export interface GeocodingFeature {
  type: string
  geometry: {
    type: string
    coordinates: [number, number]
  }
  properties: {
    label: string
    score: number
    housenumber?: string
    id: string
    name: string
    postcode: string
    citycode: string
    x: number
    y: number
    city: string
    context: string
    type: string
    importance: number
    street?: string
  }
}

export interface GeocodingResponse {
  type: string
  version: string
  features: GeocodingFeature[]
  attribution: string
  licence: string
  query: string
  limit: number
}

/**
 * Retourne l'adresse formatée à partir de coordonnées GPS (reverse geocoding).
 * Utilise l'API data.gouv.fr.
 */
export async function getAddressFromCoordinates(
  lat: number,
  lon: number
): Promise<string> {
  if (lat == null || lon == null) return ''

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = (await response.json()) as GeocodingResponse

    if (data?.features?.length > 0) {
      return data.features[0].properties.label
    }
  } catch (error) {
    console.error('Error getting address from coordinates:', error)
  }
  return ''
}
