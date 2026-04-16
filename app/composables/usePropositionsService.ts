import type { Proposition } from '~/types'

interface DuplicatePropositionInput {
  source: Proposition
}

export const usePropositionsService = () => {
  const { getAuthHeaders } = useApiAuth()

  async function toggleArchiveProposition(row: Proposition) {
    return await $fetch(`/api/propositions/${row.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: { is_archived: !row.is_archived }
    })
  }

  async function duplicateProposition(input: DuplicatePropositionInput) {
    const { source } = input
    const title = source.name.trim()
    return await $fetch('/api/propositions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        commune_id: source.commune_id,
        name: title.endsWith(' (copie)') ? title : `${title} (copie)`,
        description: source.description,
        photo_url: source.photo_url ?? null,
        comments_public: source.comments_public !== false
      }
    })
  }

  return {
    toggleArchiveProposition,
    duplicateProposition
  }
}
