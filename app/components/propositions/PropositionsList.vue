<script setup lang="ts">
import { format, isToday } from "date-fns";
import type { Proposition } from "~/types";

const props = defineProps<{
  propositions: Proposition[];
}>();

const propositionsRefs = ref<Record<string, any>>({});
const selectedProposition = defineModel<Proposition | null>();

watch(selectedProposition, () => {
  if (!selectedProposition.value) return;
  const ref = propositionsRefs.value[selectedProposition.value.id];
  if (ref) {
    ref.scrollIntoView({ block: "nearest" });
  }
});

const getStatusColor = (isArchived: boolean) => {
  return isArchived ? "neutral" : "success";
};

const getStatusLabel = (isArchived: boolean) => {
  return isArchived ? "Archivée" : "Active";
};
</script>

<template>
  <div class="overflow-y-auto divide-y divide-default">
    <div
      v-for="(proposition, index) in propositions"
      :key="index"
      :ref="
        (el) => {
          if (el) propositionsRefs[proposition.id] = el;
        }
      "
    >
      <div
        class="p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors"
        :class="[
          'text-toned',
          selectedProposition && selectedProposition.id === proposition.id
            ? 'border-primary bg-primary/10'
            : 'border-(--ui-bg) hover:border-primary hover:bg-primary/5',
        ]"
        @click="selectedProposition = proposition"
      >
        <div class="flex items-center justify-between font-semibold">
          <div class="flex items-center gap-3">
            {{ proposition.name }}
          </div>
          <span>{{
            isToday(new Date(proposition.created_at))
              ? format(new Date(proposition.created_at), "HH:mm")
              : format(new Date(proposition.created_at), "dd MMM")
          }}</span>
        </div>
        <p class="truncate text-dimmed text-xs">
          Par {{ proposition.user_firstname }} {{ proposition.user_lastname }}
        </p>
        <div class="flex items-center gap-2 mt-1">
          <UBadge
            :label="getStatusLabel(proposition.is_archived)"
            :color="getStatusColor(proposition.is_archived)"
            variant="subtle"
          />
          <p class="text-primary font-medium flex items-center gap-1">
            <UIcon name="i-lucide-thumbs-up" class="size-3" />
            {{ proposition.votes_count || 0 }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
