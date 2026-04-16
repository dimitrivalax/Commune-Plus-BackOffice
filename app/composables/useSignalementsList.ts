import type { Signalement } from '~/types'

export function useSignalementsList() {
  const { currentCommune } = useCurrentCommune()
  const { session } = useSupabase()
  const { listSignalements } = useSignalementsService()

  const signalements = ref<Signalement[]>([])
  const signalementsPending = ref(false)

  async function refreshSignalements() {
    if (!session.value?.access_token)
      return

    signalementsPending.value = true
    try {
      signalements.value = await listSignalements(currentCommune.value?.id) ?? []
    } catch {
      signalements.value = []
    } finally {
      signalementsPending.value = false
    }
  }

  watch([() => session.value?.access_token, currentCommune], () => {
    if (import.meta.client && session.value?.access_token) {
      void refreshSignalements()
    }
  }, { immediate: true })

  return {
    signalements,
    signalementsPending,
    refreshSignalements
  }
}
