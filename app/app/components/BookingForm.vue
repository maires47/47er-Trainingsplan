<script setup lang="ts">
const emit = defineEmits<{ booked: [] }>()

const form = reactive({
  first_name: '',
  team_name:  '',
  date:       new Date().toISOString().slice(0, 10),
  start_time: '17:00',
  end_time:   '18:30',
  area_sq:    0.25 as 0.25 | 0.5 | 1.0,
  pitch_id:   'training' as 'training' | 'main',
})

const availability = ref<null | {
  training: { load: number; available: number; units: { quarter: boolean; half: boolean; full: boolean } }
  main: { unlocked: boolean; message: string }
}>(null)

const loading  = ref(false)
const checking = ref(false)
const error    = ref('')
const success  = ref(false)

const areaOptions = [
  { value: 0.25, label: '1/4 Feld' },
  { value: 0.5,  label: '1/2 Feld' },
  { value: 1.0,  label: '1/1 Feld' },
]

// Verfügbarkeit laden wenn Datum/Zeit geändert wird
const startISO = computed(() => `${form.date}T${form.start_time}:00`)
const endISO   = computed(() => `${form.date}T${form.end_time}:00`)

watch([() => form.date, () => form.start_time, () => form.end_time], async () => {
  if (!form.date || !form.start_time || !form.end_time) return
  checking.value  = true
  availability.value = null
  error.value = ''
  try {
    availability.value = await $fetch('/api/availability', {
      query: { start: startISO.value, end: endISO.value }
    })
    // Hauptfeld zurücksetzen wenn nicht mehr verfügbar
    if (form.pitch_id === 'main' && !availability.value?.main.unlocked) {
      form.pitch_id = 'training'
    }
  } catch { /* ignore */ } finally {
    checking.value = false
  }
}, { immediate: true })

// Prüfen ob gewählte Einheit verfügbar
const selectedUnitAvailable = computed(() => {
  if (!availability.value) return true
  if (form.pitch_id === 'main') return availability.value.main.unlocked
  const units = availability.value.training.units
  if (form.area_sq === 0.25) return units.quarter
  if (form.area_sq === 0.5)  return units.half
  if (form.area_sq === 1.0)  return units.full
  return false
})

async function submit() {
  error.value = ''
  if (!form.first_name || !form.team_name) {
    error.value = 'Bitte Vorname und Teamname eingeben'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        first_name: form.first_name,
        team_name:  form.team_name,
        pitch_id:   form.pitch_id,
        area_sq:    form.area_sq,
        start_at:   startISO.value,
        end_at:     endISO.value,
        type:       'training',
      }
    })
    success.value = true
    emit('booked')
    setTimeout(() => { success.value = false }, 3000)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Fehler beim Speichern'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
    <h2 class="text-xl font-bold text-brand-green">Platz buchen</h2>

    <!-- Erfolgsmeldung -->
    <div v-if="success" class="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
      ✅ Buchung gespeichert!
    </div>

    <!-- Vorname + Team -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Vorname</label>
        <input
          v-model="form.first_name"
          type="text"
          placeholder="z.B. Klaus"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Team</label>
        <input
          v-model="form.team_name"
          type="text"
          placeholder="z.B. U13"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
    </div>

    <!-- Datum -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 mb-1">Datum</label>
      <input
        v-model="form.date"
        type="date"
        class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
      />
    </div>

    <!-- Uhrzeit -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Von</label>
        <input
          v-model="form.start_time"
          type="time"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
      <div>
        <label class="block text-xs font-semibold text-gray-500 mb-1">Bis</label>
        <input
          v-model="form.end_time"
          type="time"
          class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>
    </div>

    <!-- Feldgröße -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 mb-2">Feldgröße</label>
      <div class="flex gap-2">
        <button
          v-for="opt in areaOptions"
          :key="opt.value"
          @click="form.area_sq = opt.value as any"
          class="flex-1 py-2 rounded-xl text-sm font-medium border transition-colors"
          :class="form.area_sq === opt.value
            ? 'bg-brand-green text-white border-brand-green'
            : 'border-gray-200 text-gray-600 hover:border-brand-green'"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Platz-Auswahl -->
    <div>
      <label class="block text-xs font-semibold text-gray-500 mb-2">Platz</label>

      <!-- Verfügbarkeits-Status -->
      <div v-if="checking" class="text-xs text-gray-400 mb-2">Prüfe Verfügbarkeit…</div>
      <div
        v-else-if="availability"
        class="text-xs mb-2 px-3 py-2 rounded-lg"
        :class="availability.main.unlocked ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'"
      >
        {{ availability.main.message }}
      </div>

      <div class="flex gap-2">
        <button
          @click="form.pitch_id = 'training'"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
          :class="form.pitch_id === 'training'
            ? 'bg-brand-green text-white border-brand-green'
            : 'border-gray-200 text-gray-600 hover:border-brand-green'"
        >
          🏟 Trainingsplatz
        </button>
        <button
          @click="form.pitch_id = 'main'"
          :disabled="!availability?.main.unlocked"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
          :class="[
            form.pitch_id === 'main' ? 'bg-brand-dark text-white border-brand-dark' : 'border-gray-200 text-gray-600',
            !availability?.main.unlocked ? 'opacity-40 cursor-not-allowed' : 'hover:border-brand-dark'
          ]"
        >
          {{ availability?.main.unlocked ? '🏆' : '🔒' }} Hauptfeld
        </button>
      </div>
    </div>

    <!-- Fehler -->
    <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

    <!-- Submit -->
    <button
      @click="submit"
      :disabled="loading || !selectedUnitAvailable"
      class="w-full bg-brand-gold text-brand-dark font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
    >
      {{ loading ? 'Wird gespeichert…' : 'Buchung bestätigen' }}
    </button>
  </div>
</template>
