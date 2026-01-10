<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Signalement } from '~/types'
import { format } from 'date-fns'

const props = defineProps<{
  signalements: Signalement[]
}>()

const emit = defineEmits<{
  'marker-click': [signalement: Signalement]
}>()

const zoom = ref(6)
const center = ref<[number, number]>([46.6034, 1.8883])

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'en_attente':
      return 'En attente'
    case 'en_cours':
      return 'En cours'
    case 'traité':
      return 'Traité'
    default:
      return status
  }
}

const getMarkerColor = (status: string) => {
  switch (status) {
    case 'en_attente':
      return '#f97316' // orange
    case 'en_cours':
      return '#3b82f6' // blue
    case 'traité':
      return '#22c55e' // green
    default:
      return '#6b7280' // gray
  }
}

// Filtrer les signalements avec des coordonnées valides
const signalementsWithCoords = computed(() => {
  const filtered = props.signalements.filter(
    s => s.latitude !== null && s.longitude !== null && 
         !isNaN(s.latitude!) && !isNaN(s.longitude!)
  )
  // Debug: afficher dans la console
  if (import.meta.client) {
    console.log('Signalements avec coordonnées:', filtered.length, 'sur', props.signalements.length)
  }
  return filtered
})

// Calculer le centre et le zoom pour afficher tous les marqueurs
const mapBounds = computed(() => {
  if (signalementsWithCoords.value.length === 0) {
    return null
  }
  
  const lats = signalementsWithCoords.value.map(s => s.latitude!)
  const lngs = signalementsWithCoords.value.map(s => s.longitude!)
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  }
})

// Ajuster la vue quand les signalements changent
watch(signalementsWithCoords, (newSignalements) => {
  if (newSignalements.length > 0 && mapBounds.value) {
    const bounds = mapBounds.value
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLng = (bounds.east + bounds.west) / 2
    center.value = [centerLat, centerLng]
    // Ajuster le zoom en fonction de l'étendue
    const latDiff = bounds.north - bounds.south
    const lngDiff = bounds.east - bounds.west
    const maxDiff = Math.max(latDiff, lngDiff)
    if (maxDiff > 0) {
      // Calculer un zoom approximatif basé sur l'étendue
      if (maxDiff > 10) zoom.value = 5
      else if (maxDiff > 5) zoom.value = 6
      else if (maxDiff > 2) zoom.value = 7
      else if (maxDiff > 1) zoom.value = 8
      else if (maxDiff > 0.5) zoom.value = 9
      else zoom.value = 10
    }
  }
}, { immediate: true })

const handleMarkerClick = (signalement: Signalement) => {
  emit('marker-click', signalement)
}

// Créer une icône SVG personnalisée pour chaque statut
const createMarkerIcon = (status: string) => {
  const color = getMarkerColor(status)
  // Encoder le SVG correctement pour l'URL
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
</script>

<template>
  <div class="w-full h-full min-h-[600px]">
    <ClientOnly>
      <LMap
        :zoom="zoom"
        :center="center"
        :use-global-leaflet="false"
        class="w-full h-full"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />
        
        <LMarker
          v-for="signalement in signalementsWithCoords"
          :key="signalement.id"
          :lat-lng="[signalement.latitude!, signalement.longitude!]"
          @click="handleMarkerClick(signalement)"
        >
          <LIcon
            :icon-url="createMarkerIcon(signalement.status)"
            :icon-size="[24, 24]"
            :icon-anchor="[12, 24]"
          />
          <LPopup>
            <div style="min-width: 200px; max-width: 300px;">
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 14px;">{{ signalement.first_name }} {{ signalement.last_name }}</strong>
              </div>
              <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
                {{ signalement.description || 'Aucune description' }}
              </div>
              <div style="margin-bottom: 8px;">
                <span :style="{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  backgroundColor: getMarkerColor(signalement.status) + '20',
                  color: getMarkerColor(signalement.status)
                }">{{ getStatusLabel(signalement.status) }}</span>
              </div>
              <div style="font-size: 11px; color: #999; margin-bottom: 8px;">
                {{ format(new Date(signalement.created_at), 'dd MMM yyyy HH:mm') }}
              </div>
              <div v-if="signalement.address" style="font-size: 11px; color: #666; margin-top: 4px;">
                📍 {{ signalement.address }}
              </div>
              <button
                @click="handleMarkerClick(signalement)"
                style="
                  margin-top: 8px;
                  padding: 4px 12px;
                  background-color: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  width: 100%;
                "
              >
                Voir les détails
              </button>
            </div>
          </LPopup>
        </LMarker>
      </LMap>
      <template #fallback>
        <div class="flex items-center justify-center h-full min-h-[600px]">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-dimmed" />
        </div>
      </template>
    </ClientOnly>
    <div v-if="signalementsWithCoords.length === 0" class="absolute inset-0 flex items-center justify-center bg-elevated/50 z-10">
      <div class="text-center p-4">
        <UIcon name="i-lucide-map-pin-off" class="size-12 text-dimmed mb-2 mx-auto" />
        <p class="text-dimmed">Aucun signalement avec coordonnées GPS</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Importer les styles Leaflet */
@import 'leaflet/dist/leaflet.css';

:deep(.leaflet-popup-content-wrapper) {
  font-family: inherit;
}

/* S'assurer que la carte prend toute la hauteur */
:deep(.leaflet-container) {
  height: 100% !important;
  width: 100% !important;
  z-index: 0;
}

/* Styles pour les marqueurs */
:deep(.leaflet-marker-icon) {
  border: none;
  background: transparent;
}

/* S'assurer que les marqueurs sont visibles */
:deep(.leaflet-marker-pane) {
  z-index: 600;
}

:deep(.leaflet-popup-pane) {
  z-index: 700;
}
</style>
