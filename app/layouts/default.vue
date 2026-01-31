<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();

const open = ref(false);

const {
  currentCommune,
  userCommunes,
  userCommunesPending,
  setCurrentCommune,
  refreshUserCommunes,
} = useCurrentCommune();
const { isAdministrator } = useCurrentUser();

const editCommuneModal = useTemplateRef<{ openModal: () => void }>(
  "editCommuneModal",
);

provide("refresh-communes", refreshUserCommunes);

// Gérer la sélection de la commune courante (réservé aux administrateurs)
const selectedCommuneId = computed({
  get: () => currentCommune.value?.id || "",
  set: (value: string) => {
    const commune = userCommunes.value?.find((c) => c.id === value);
    if (commune) {
      setCurrentCommune(commune);
    }
  },
});

// Items du select (computed pour éviter recalculs et s'assurer que la liste est stable)
const communeSelectItems = computed(() =>
  (userCommunes.value || []).map((c) => ({
    label: `${c.name} (${c.postal_code})`,
    value: c.id,
  })),
);

// Liens de navigation : Utilisateurs et Communes uniquement pour les administrateurs
const baseNavItems: NavigationMenuItem[] = [
  {
    label: "Accueil",
    icon: "i-lucide-house",
    to: "/",
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: "Signalements",
    icon: "i-lucide-alert-triangle",
    to: "/signalements",
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: "Informations",
    icon: "i-lucide-info",
    to: "/informations",
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: "Salles",
    icon: "i-lucide-building",
    to: "/salles",
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: "Planning des réservations",
    icon: "i-lucide-calendar",
    to: "/reservations-salles",
    onSelect: () => {
      open.value = false;
    },
  },
];

const adminOnlyNavItems: NavigationMenuItem[] = [
  {
    label: "Utilisateurs",
    icon: "i-lucide-user-circle",
    to: "/utilisateurs",
    onSelect: () => {
      open.value = false;
    },
  },
  {
    label: "Communes",
    icon: "i-lucide-map-pin",
    to: "/communes",
    onSelect: () => {
      open.value = false;
    },
  },
];

const mainNavItems = computed(() =>
  isAdministrator.value
    ? [...baseNavItems, ...adminOnlyNavItems]
    : baseNavItems,
);

const links = computed<NavigationMenuItem[][]>(() => [[mainNavItems.value]]);

const groups = computed(() => [
  {
    id: "links",
    label: "Aller à",
    items: links.value.flat(),
  },
  {
    id: "code",
    label: "Code",
    items: [
      {
        id: "source",
        label: "Voir le code source de la page",
        icon: "i-simple-icons-github",
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === "/" ? "/index" : route.path}.vue`,
        target: "_blank",
      },
    ],
  },
]);

onMounted(async () => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") {
    return;
  }

  toast.add({
    title:
      "Nous utilisons des cookies internes pour améliorer votre expérience sur notre site web.",
    duration: 0,
    close: false,
    actions: [
      {
        label: "Accepter",
        color: "neutral",
        variant: "outline",
        onClick: () => {
          cookie.value = "accepted";
        },
      },
      {
        label: "Refuser",
        color: "neutral",
        variant: "ghost",
      },
    ],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header>
        <img src="/logo.png" alt="logo" class="w-20 h-20 mx-auto" />
      </template>

      <template #default="{ collapsed }">
        <div
          class="flex flex-col items-center gap-2 px-1.5 py-4 min-w-0 mb-4 border-b border-default mx-2 transition-colors rounded-lg cursor-pointer hover:bg-elevated"
          @click="editCommuneModal?.openModal()"
        >
          <UAvatar
            v-if="currentCommune?.logo_url"
            :src="currentCommune.logo_url"
            :alt="currentCommune.name"
            size="2xl"
            class="shrink-0 ring-1 ring-default bg-elevated"
          />
          <UAvatar
            v-else
            icon="i-lucide-map-pin"
            size="2xl"
            class="shrink-0 ring-1 ring-default bg-elevated"
          />

          <div
            v-if="!collapsed"
            class="flex flex-col items-center min-w-0 overflow-hidden mt-2"
          >
            <span
              class="text-sm font-bold truncate text-foreground text-center"
            >
              {{ currentCommune?.name || "Commune Plus" }}
            </span>
            <span
              v-if="currentCommune?.postal_code"
              class="text-xs text-muted truncate text-center"
            >
              {{ currentCommune.postal_code }}
            </span>
          </div>
        </div>

        <div
          v-if="
            isAdministrator &&
            !userCommunesPending &&
            communeSelectItems.length > 0
          "
          class="px-3 py-2"
        >
          <UFormField label="Commune courante" name="commune">
            <USelect
              v-model="selectedCommuneId"
              :items="communeSelectItems"
              placeholder="Sélectionner une commune"
            />
          </UFormField>
        </div>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />

    <CommunesEditModal ref="editCommuneModal" :commune="currentCommune" />
  </UDashboardGroup>
</template>
