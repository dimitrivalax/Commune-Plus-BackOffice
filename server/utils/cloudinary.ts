import { createHash } from 'node:crypto'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

function getConfig() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set')
  }
  return { cloudName, apiKey, apiSecret }
}

/**
 * Génère la signature Cloudinary pour les appels API authentifiés.
 * params: objet des paramètres à signer.
 * Cloudinary n'inclut PAS api_key, file, cloud_name, resource_type dans la signature.
 */
function signRequest(params: Record<string, string | number | undefined>): string {
  const { apiSecret } = getConfig()
  const exclude = new Set(['api_key', 'file', 'cloud_name', 'resource_type', 'signature'])
  const sorted = Object.keys(params)
    .filter((k) => !exclude.has(k) && params[k] !== undefined && params[k] !== '')
    .sort()
  const str = sorted.map((k) => `${k}=${params[k]}`).join('&')
  return createHash('sha1').update(str + apiSecret).digest('hex')
}

export interface GalleryImage {
  public_id: string
  secure_url: string
  width: number
  height: number
  created_at?: string
}

export interface ListResourcesResponse {
  resources: GalleryImage[]
  next_cursor?: string
}

/**
 * Liste les images dans le dossier galleries/{communeId}
 * L'API Admin Cloudinary utilise l'authentification Basic (API Key + Secret), pas la signature.
 */
export async function listGalleryImages(communeId: string, maxResults = 100): Promise<GalleryImage[]> {
  const { cloudName, apiKey, apiSecret } = getConfig()
  const prefix = `galleries/${communeId}`
  const query = new URLSearchParams({
    type: 'upload',
    prefix,
    max_results: String(maxResults)
  })
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?${query.toString()}`
  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${basicAuth}`
    }
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudinary list failed: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { resources?: GalleryImage[] }
  return data.resources ?? []
}

/**
 * Upload une image dans le dossier galleries/{communeId}
 * file: Buffer ou base64 string (data URL ou raw base64)
 */
export async function uploadGalleryImage(
  communeId: string,
  file: Buffer | string
): Promise<{ secure_url: string; public_id: string }> {
  const { cloudName, apiKey } = getConfig()
  const folder = `galleries/${communeId}`
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const params: Record<string, string> = {
    api_key: apiKey!,
    timestamp,
    folder
  }
  const signature = signRequest(params)

  let fileData: string
  if (Buffer.isBuffer(file)) {
    fileData = `data:image/jpeg;base64,${file.toString('base64')}`
  } else if (typeof file === 'string') {
    fileData = file.includes(',') ? file : `data:image/jpeg;base64,${file}`
  } else {
    throw new Error('Invalid file format')
  }

  const form = new FormData()
  form.append('file', fileData)
  form.append('api_key', apiKey!)
  form.append('timestamp', timestamp)
  form.append('signature', signature)
  form.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudinary upload failed: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { secure_url: string; public_id: string }
  return { secure_url: data.secure_url, public_id: data.public_id }
}

/**
 * Supprime une image par public_id. Sécurité : n'autorise que les public_id sous galleries/
 */
export async function deleteGalleryImage(publicId: string): Promise<void> {
  if (!publicId.startsWith('galleries/')) {
    throw new Error('Invalid public_id: only gallery images can be deleted')
  }
  const { cloudName, apiKey } = getConfig()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const params: Record<string, string> = {
    api_key: apiKey!,
    timestamp,
    public_id: publicId
  }
  const signature = signRequest(params)

  const form = new FormData()
  form.append('api_key', apiKey!)
  form.append('timestamp', timestamp)
  form.append('signature', signature)
  form.append('public_id', publicId)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: 'POST',
    body: form
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Cloudinary delete failed: ${res.status} ${err}`)
  }
}
