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

  const metadata = supabaseUser.value.user_metadata || {};
  const firstName = metadata.first_name || "";
  const lastName = metadata.last_name || "";
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

const items = computed<DropdownMenuItem[][]>(() => [
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
  [
    {
      //   label: 'Documentation',
      //   icon: 'i-lucide-book-open',
      //   to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
      //   target: '_blank'
      // }, {
      //   label: 'Dépôt GitHub',
      //   icon: 'i-simple-icons-github',
      //   to: 'https://github.com/nuxt-ui-templates/dashboard',
      //   target: '_blank'
      // }, {
      label: "Déconnexion",
      icon: "i-lucide-log-out",
      onClick: handleSignOut,
    },
  ],
]);
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
  </div>
</template>
