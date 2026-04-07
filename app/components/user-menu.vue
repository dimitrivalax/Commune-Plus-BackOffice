<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{
  collapsed?: boolean;
}>();

const router = useRouter();
const toast = useToast();
const colorMode = useColorMode();
const appConfig = useAppConfig();
const { user: supabaseUser, signOut } = useSupabase();
const { currentCommune } = useCurrentCommune();
const openEditCommune = inject<() => void>("open-edit-commune");
const { status, accept, refuse, reset } = useCookieConsent();

const colors = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];
const neutrals = ["slate", "gray", "zinc", "neutral", "stone"];

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

const user = computed(() => {
  // Utiliser les valeurs par défaut jusqu'à ce que le composant soit monté pour éviter les problèmes d'hydratation
  if (!isMounted.value || !supabaseUser.value) {
    return {
      name: "Utilisateur",
      email: "",
      avatar: {
        src: "https://ui-avatars.com/api/?name=User&background=random",
        alt: "Utilisateur",
      },
    };
  }

  const dn = (supabaseUser.value.displayName || "").trim();
  const parts = dn.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  const fullName =
    `${firstName} ${lastName}`.trim() ||
    supabaseUser.value.email ||
    "Utilisateur";

  return {
    name: fullName,
    email: supabaseUser.value.email || "",
    avatar: {
      src: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
      alt: fullName,
    },
  };
});

const handleSignOut = async () => {
  try {
    await signOut();
    toast.add({
      title: "Déconnexion réussie",
      color: "success",
    });
    router.push("/login");
  } catch (error: any) {
    toast.add({
      title: "Erreur lors de la déconnexion",
      description: error.message || "Une erreur est survenue",
      color: "error",
    });
  }
};

const editProfileModal = ref<any>(null);
const contactModalOpen = ref(false);
const cookieModalOpen = ref(false);

const cookieStatusLabel = computed(() => {
  if (status.value === "accepted") {
    return "Acceptés";
  }
  if (status.value === "refused") {
    return "Refusés";
  }
  return "En attente de choix";
});

function applyCookieChoice(choice: "accepted" | "refused" | "reset") {
  if (choice === "accepted") {
    accept();
    toast.add({
      title: "Préférences cookies mises à jour",
      description: "Les cookies optionnels sont désormais activés.",
      color: "success",
    });
    return;
  }

  if (choice === "refused") {
    refuse();
    toast.add({
      title: "Préférences cookies mises à jour",
      description: "Les cookies optionnels sont désormais désactivés.",
      color: "success",
    });
    return;
  }

  reset();
  toast.add({
    title: "Préférences cookies réinitialisées",
    description: "Le bandeau de consentement sera affiché à nouveau.",
    color: "success",
  });
}

const items = computed<DropdownMenuItem[][]>(() => {
  const footerGroup: DropdownMenuItem[] = [];
  if (currentCommune.value && openEditCommune) {
    footerGroup.push({
      label: "Commune",
      icon: "i-lucide-map-pin",
      onSelect: (e: Event) => {
        e.preventDefault();
        openEditCommune();
      },
    });
  }
  footerGroup.push(
    {
      label: "Contact",
      icon: "i-lucide-mail",
      onSelect: (e: Event) => {
        e.preventDefault();
        contactModalOpen.value = true;
      },
    },
    {
      label: "Préférences cookies",
      icon: "i-lucide-cookie",
      onSelect: (e: Event) => {
        e.preventDefault();
        cookieModalOpen.value = true;
      },
    },
    {
      label: "Déconnexion",
      icon: "i-lucide-log-out",
      onClick: handleSignOut,
    },
  );

  return [
    [
      {
        type: "label",
        label: user.value.name,
        description: user.value.email,
        avatar: user.value.avatar,
      },
    ],
    // [
    //   {
    //     label: "Profil",
    //     icon: "i-lucide-user",
    //     onClick: () => {
    //       console.log("Profil clicked, opening modal", editProfileModal.value);
    //       editProfileModal.value?.openModal();
    //     },
    //   },
    //   {
    //     label: "Paramètres",
    //     icon: "i-lucide-settings",
    //     to: "/settings",
    //   },
    // ],
    [
    {
      label: "Thème",
      icon: "i-lucide-palette",
      children: [
        {
          label: "Primaire",
          slot: "chip",
          chip: appConfig.ui.colors.primary,
          content: {
            align: "center",
            collisionPadding: 16,
          },
          children: colors.map((color) => ({
            label: color,
            chip: color,
            slot: "chip",
            checked: appConfig.ui.colors.primary === color,
            type: "checkbox",
            onSelect: (e) => {
              e.preventDefault();

              appConfig.ui.colors.primary = color;
            },
          })),
        },
        // {
        //   label: "Neutre",
        //   slot: "chip",
        //   chip:
        //     appConfig.ui.colors.neutral === "neutral"
        //       ? "old-neutral"
        //       : appConfig.ui.colors.neutral,
        //   content: {
        //     align: "end",
        //     collisionPadding: 16,
        //   },
        //   children: neutrals.map((color) => ({
        //     label: color,
        //     chip: color === "neutral" ? "old-neutral" : color,
        //     slot: "chip",
        //     type: "checkbox",
        //     checked: appConfig.ui.colors.neutral === color,
        //     onSelect: (e) => {
        //       e.preventDefault();

        //       appConfig.ui.colors.neutral = color;
        //     },
        //   })),
        // },
      ],
    },
    {
      label: "Apparence",
      icon: "i-lucide-sun-moon",
      children: [
        {
          label: "Clair",
          icon: "i-lucide-sun",
          type: "checkbox",
          checked: colorMode.value === "light",
          onSelect(e: Event) {
            e.preventDefault();

            colorMode.preference = "light";
          },
        },
        {
          label: "Sombre",
          icon: "i-lucide-moon",
          type: "checkbox",
          checked: colorMode.value === "dark",
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = "dark";
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
      ],
    },
  ],
  // [
  //   {
  //     label: "Modèles",
  //     icon: "i-lucide-layout-template",
  //     children: [
  //       {
  //         label: "Starter",
  //         to: "https://starter-template.nuxt.dev/",
  //       },
  //       {
  //         label: "Landing",
  //         to: "https://landing-template.nuxt.dev/",
  //       },
  //       {
  //         label: "Docs",
  //         to: "https://docs-template.nuxt.dev/",
  //       },
  //       {
  //         label: "SaaS",
  //         to: "https://saas-template.nuxt.dev/",
  //       },
  //       {
  //         label: "Dashboard",
  //         to: "https://dashboard-template.nuxt.dev/",
  //         color: "primary",
  //         checked: true,
  //         type: "checkbox",
  //       },
  //       {
  //         label: "Chat",
  //         to: "https://chat-template.nuxt.dev/",
  //       },
  //       {
  //         label: "Portfolio",
  //         to: "https://portfolio-template.nuxt.dev/",
  //       },
  //       {
  //         label: "Changelog",
  //         to: "https://changelog-template.nuxt.dev/",
  //       },
  //     ],
  //   },
  // ],
    footerGroup,
  ];
});
</script>

<template>
  <div class="w-full">
    <UDropdownMenu
      :items="items"
      :content="{ align: 'center', collisionPadding: 12 }"
      :ui="{
        content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)',
      }"
    >
      <UButton
        v-bind="{
          ...user,
          label: collapsed ? undefined : user?.name,
          trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
        }"
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="data-[state=open]:bg-elevated"
        :ui="{
          trailingIcon: 'text-dimmed',
        }"
      />

      <template #chip-leading="{ item }">
        <div class="inline-flex items-center justify-center shrink-0 size-5">
          <span
            class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
            :style="{
              '--chip-light': `var(--color-${(item as any).chip}-500)`,
              '--chip-dark': `var(--color-${(item as any).chip}-400)`,
            }"
          />
        </div>
      </template>
    </UDropdownMenu>

    <SettingsProfileEditModal ref="editProfileModal" />

    <UModal
      v-model:open="contactModalOpen"
      title="Nous contacter"
      description="Une question ou un besoin d'assistance ?"
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <div class="space-y-4 py-2">
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Pour nous contacter, envoyez-nous un mail à l'adresse suivante :
          </p>
          <div
            class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center gap-2 group"
          >
            <UIcon name="i-lucide-mail" class="text-primary size-5" />
            <a
              href="mailto:contact@commune-plus.fr"
              class="text-primary font-semibold hover:underline decoration-2 underline-offset-4 transition-all"
            >
              contact@commune-plus.fr
            </a>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton
          label="Fermer"
          color="neutral"
          variant="subtle"
          @click="contactModalOpen = false"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="cookieModalOpen"
      title="Préférences cookies"
      description="Gérez votre consentement pour les cookies optionnels (mesure d'audience)."
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #body>
        <div class="space-y-4 py-2">
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            Statut actuel :
            <span class="font-medium text-highlighted">
              {{ cookieStatusLabel }}
            </span>
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              label="Accepter"
              color="success"
              variant="soft"
              @click="applyCookieChoice('accepted')"
            />
            <UButton
              label="Refuser"
              color="error"
              variant="soft"
              @click="applyCookieChoice('refused')"
            />
            <UButton
              label="Réinitialiser"
              color="neutral"
              variant="ghost"
              @click="applyCookieChoice('reset')"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <UButton
          label="Fermer"
          color="neutral"
          variant="subtle"
          @click="cookieModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>
