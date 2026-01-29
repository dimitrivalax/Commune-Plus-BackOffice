<script setup lang="ts">
const shortcuts = [
  {
    title: 'Informations',
    description: 'Gérer les informations municipales',
    icon: 'i-lucide-info',
    to: '/informations',
    iconBgClass: 'bg-primary-50 dark:bg-primary-900/20',
    iconTextClass: 'text-primary-600 dark:text-primary-400'
  },
  {
    title: 'Signalements',
    description: 'Consulter et gérer les signalements',
    icon: 'i-lucide-alert-triangle',
    to: '/signalements',
    iconBgClass: 'bg-orange-50 dark:bg-orange-900/20',
    iconTextClass: 'text-orange-600 dark:text-orange-400'
  },
  {
    title: 'Planning des réservations',
    description: 'Voir le planning des réservations de salles',
    icon: 'i-lucide-calendar',
    to: '/reservations-salles',
    iconBgClass: 'bg-blue-50 dark:bg-blue-900/20',
    iconTextClass: 'text-blue-600 dark:text-blue-400'
  }
]
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Accueil" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <NotificationBell />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bienvenue
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            Accédez rapidement aux principales fonctionnalités
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="shortcut in shortcuts"
            :key="shortcut.to"
            :to="shortcut.to"
            class="block"
          >
            <UCard class="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <template #header>
                <div class="flex items-center gap-4">
                  <div
                    :class="['p-3 rounded-lg', shortcut.iconBgClass]"
                  >
                    <UIcon
                      :name="shortcut.icon"
                      :class="['size-6', shortcut.iconTextClass]"
                    />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ shortcut.title }}
                    </h3>
                  </div>
                </div>
              </template>

              <p class="text-gray-600 dark:text-gray-400 mt-2">
                {{ shortcut.description }}
              </p>

              <template #footer>
                <div class="flex items-center justify-end">
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="size-4 text-gray-400"
                  />
                </div>
              </template>
            </UCard>
          </NuxtLink>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
