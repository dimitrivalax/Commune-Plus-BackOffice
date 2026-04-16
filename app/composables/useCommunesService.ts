export const useCommunesService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function deleteCommune(id: string) {
    return await $fetch(`/api/communes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
  }

  return { deleteCommune }
}
