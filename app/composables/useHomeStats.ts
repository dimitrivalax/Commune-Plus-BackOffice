import type { Period, Range, Stat } from '~/types'

interface BaseStatConfig {
  title: string
  icon: string
  minValue: number
  maxValue: number
  minVariation: number
  maxVariation: number
  formatter?: (value: number) => string | number
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  })
}

const BASE_STATS: BaseStatConfig[] = [{
  title: 'Clients',
  icon: 'i-lucide-users',
  minValue: 400,
  maxValue: 1000,
  minVariation: -15,
  maxVariation: 25
}, {
  title: 'Conversions',
  icon: 'i-lucide-chart-pie',
  minValue: 1000,
  maxValue: 2000,
  minVariation: -10,
  maxVariation: 20
}, {
  title: 'Revenus',
  icon: 'i-lucide-circle-dollar-sign',
  minValue: 200000,
  maxValue: 500000,
  minVariation: -20,
  maxVariation: 30,
  formatter: formatCurrency
}, {
  title: 'Commandes',
  icon: 'i-lucide-shopping-cart',
  minValue: 100,
  maxValue: 300,
  minVariation: -5,
  maxVariation: 15
}]

export function useHomeStats(period: Ref<Period>, range: Ref<Range>) {
  const stats = ref<Stat[]>([])

  function regenerateStats() {
    stats.value = BASE_STATS.map((stat) => {
      const value = randomInt(stat.minValue, stat.maxValue)
      const variation = randomInt(stat.minVariation, stat.maxVariation)

      return {
        title: stat.title,
        icon: stat.icon,
        value: stat.formatter ? stat.formatter(value) : value,
        variation
      }
    })
  }

  watch([period, range], regenerateStats, { immediate: true })

  return { stats }
}
