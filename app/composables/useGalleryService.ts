interface GalleryImage {
  public_id: string
  secure_url: string
  width: number
  height: number
}

export const useGalleryService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function listGallery(communeId: string) {
    return await $fetch<{ images: GalleryImage[] }>(`/api/gallery/${communeId}`, {
      headers: getAuthHeaders()
    })
  }

  async function uploadGalleryImage(formData: FormData) {
    return await $fetch<{ secure_url: string, public_id: string }>('/api/gallery/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
  }

  async function deleteGalleryImage(publicId: string) {
    return await $fetch('/api/gallery/delete', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { public_id: publicId }
    })
  }

  return { listGallery, uploadGalleryImage, deleteGalleryImage }
}
