<script setup lang="ts">
defineProps<{
  feature: "reservations" | "propositions";
}>();

const CONTACT_EMAIL = "contact@commune-plus.fr";

const leadText = {
  reservations:
    "La fonctionnalité « Réservation de salles » est désactivée dans l’application mobile des citoyens.",
  propositions:
    "La fonctionnalité « Propositions » est désactivée dans l’application mobile des citoyens.",
} as const;
</script>

<template>
  <div
    class="mb-4 rounded-lg border border-warning/40 bg-warning/10 dark:bg-warning/15 px-4 py-3 flex gap-3 items-start"
    role="status"
  >
    <UIcon
      name="i-lucide-smartphone"
      class="size-5 text-warning shrink-0 mt-0.5"
    />
    <div class="text-sm min-w-0">
      <p class="font-medium text-highlighted">
        {{ leadText[feature] }}
      </p>
      <p class="text-muted mt-1.5 leading-relaxed">
        Pour l’activer, contactez :
        <a
          :href="`mailto:${CONTACT_EMAIL}`"
          class="text-primary font-medium underline-offset-2 hover:underline"
        >{{ CONTACT_EMAIL }}</a>.
      </p>
    </div>
  </div>
</template>
