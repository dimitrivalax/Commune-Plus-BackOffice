import type { MaybeRefOrGetter } from 'vue'
import { toValue, watch, ref, computed } from 'vue'
import { getAddressFromCoordinates } from '~/utils/geocoding'

export interface SignalementLocation {
  id?: string
  address: string | null
  latitude: number | null
  longitude: number | null
}

/**
 * Composable pour afficher l'adresse d'un signalement :
 * - utilise l'adresse saisie si présente,
 * - sinon résout l'adresse via géocodage inverse (API data.gouv.fr) à partir des coordonnées GPS,
 * - sinon affiche les coordonnées.
 */
export function useSignalementAddress(signalement: MaybeRefOrGetter<SignalementLocation>) {
  const resolvedAddressFromCoords = ref<string | null>(null)
  const isResolvingAddress = ref(false)

  async function resolveAddressFromCoords() {
    const s = toValue(signalement)
    const { latitude, longitude, address } = s
    if (address?.trim() || latitude == null || longitude == null) {
      resolvedAddressFromCoords.value = null
      return
    }
    isResolvingAddress.value = true
    resolvedAddressFromCoords.value = null
    try {
      const label = await getAddressFromCoordinates(latitude, longitude)
      resolvedAddressFromCoords.value = label || null
    } finally {
      isResolvingAddress.value = false
    }
  }

  watch(
    () => {
      const s = toValue(signalement)
      return [s.id, s.latitude, s.longitude, s.address] as const
    },
    () => resolveAddressFromCoords(),
    { immediate: true }
  )

  const displayAddress = computed(() => {
    const s = toValue(signalement)
    if (s.address?.trim()) {
      return s.address.trim()
    }
    if (resolvedAddressFromCoords.value) {
      return resolvedAddressFromCoords.value
    }
    if (s.latitude != null && s.longitude != null) {
      return `${s.latitude.toFixed(6)}, ${s.longitude.toFixed(6)}`
    }
    return null
  })

  const showLocalisation = computed(
    () => displayAddress.value !== null || isResolvingAddress.value
  )

  return {
    displayAddress,
    showLocalisation,
    isResolvingAddress
  }
}
