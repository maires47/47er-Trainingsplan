<script setup lang="ts">
const props = defineProps<{ bookingId: string }>()
const emit  = defineEmits<{ close: []; deleted: [] }>()

const pin     = ref('')
const error   = ref('')
const loading = ref(false)

async function confirmDelete() {
  if (!pin.value) { error.value = 'Bitte PIN eingeben'; return }
  loading.value = true
  error.value   = ''

  try {
    await $fetch(`/api/bookings/${props.bookingId}`, {
      method: 'DELETE',
      body: { pin: pin.value },
    })
    emit('deleted')
    emit('close')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Fehler beim Löschen'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
      <h2 class="text-lg font-bold text-gray-800">Buchung löschen</h2>
      <p class="text-sm text-gray-500">Bitte Admin-PIN eingeben um diese Buchung zu löschen.</p>

      <input
        v-model="pin"
        type="password"
        inputmode="numeric"
        maxlength="6"
        placeholder="PIN"
        class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-brand-green"
        @keyup.enter="confirmDelete"
      />

      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>

      <div class="flex gap-2">
        <button
          @click="emit('close')"
          class="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="confirmDelete"
          :disabled="loading"
          class="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {{ loading ? 'Löschen...' : 'Löschen' }}
        </button>
      </div>
    </div>
  </div>
</template>
