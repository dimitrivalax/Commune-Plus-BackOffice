<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const schema = z.object({
  name: z.string().min(2, 'Trop court'),
  email: z.string().email('E-mail invalide')
})
const open = ref(false)

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Succès', description: `Nouveau client ${event.data.name} ajouté`, color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" title="Nouveau client" description="Ajouter un nouveau client à la base de données">
    <UButton label="Nouveau client" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nom" placeholder="Jean Dupont" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField label="E-mail" placeholder="jean.dupont@exemple.com" name="email">
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Annuler"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Créer"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
