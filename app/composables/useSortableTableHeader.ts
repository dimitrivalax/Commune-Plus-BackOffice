import type { Column } from '@tanstack/table-core'
import { UButton } from '#components'
import { h } from 'vue'

/**
 * En-têtes de colonnes triables pour UTable (TanStack Table + Nuxt UI).
 * Avec pagination manuelle : `v-model:sorting` + `sorting-options: { manualSorting: true }`.
 */
export function useSortableTableHeader<T>() {
  return (label: string) =>
    ({ column }: { column: Column<T, unknown> }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label,
        icon: isSorted
          ? (isSorted === 'asc'
              ? 'i-lucide-arrow-up-narrow-wide'
              : 'i-lucide-arrow-down-wide-narrow')
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
}
