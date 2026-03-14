<script setup lang="ts">
import type { Booking } from '~/composables/useBookings'

const props = defineProps<{ bookings: Booking[] }>()

// Aktuell angezeigte Woche
const currentWeekStart = ref(getMonday(new Date()))

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const days = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    return d
  })
})

const weekLabel = computed(() => {
  const start = days.value[0]
  const end   = days.value[6]
  return `${start.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
})

function prevWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
  emit('weekChange', d)
}
function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
  emit('weekChange', d)
}

const emit = defineEmits<{ weekChange: [date: Date] }>()

// Buchungen eines Tages für einen Platz
function dayBookings(day: Date, pitchId: string): Booking[] {
  const dayStr = day.toISOString().slice(0, 10)
  return props.bookings.filter(b =>
    b.pitch_id === pitchId && b.start_at.slice(0, 10) === dayStr
  )
}

// Auslastung 0–4 Einheiten (Trainingsplatz)
function trainLoad(day: Date): number {
  return dayBookings(day, 'training').reduce((s, b) => s + b.area_sq, 0)
}

function loadColor(load: number): string {
  if (load >= 1.0)  return 'bg-red-500'
  if (load >= 0.75) return 'bg-amber-400'
  return 'bg-green-500'
}

function loadLabel(load: number): string {
  return `${Math.round(load * 4)}/4`
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const isToday = (d: Date) => d.toDateString() === new Date().toDateString()
</script>

<template>
  <div class="space-y-4">
    <!-- Woche Navigation -->
    <div class="flex items-center justify-between">
      <button
        @click="prevWeek"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label="Vorherige Woche"
      >
        ←
      </button>
      <span class="text-sm font-semibold text-gray-700">{{ weekLabel }}</span>
      <button
        @click="nextWeek"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        aria-label="Nächste Woche"
      >
        →
      </button>
    </div>

    <!-- Trainingsplatz -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="bg-brand-green px-4 py-2 flex items-center gap-2">
        <span class="text-white text-sm font-bold">🏟 Trainingsplatz</span>
      </div>
      <div class="grid grid-cols-7 divide-x divide-gray-100">
        <div v-for="(day, i) in days" :key="i" class="flex flex-col">
          <!-- Tag-Header -->
          <div
            class="text-center py-1.5 text-xs font-semibold border-b border-gray-100"
            :class="isToday(day) ? 'bg-brand-gold/20 text-brand-green' : 'text-gray-500'"
          >
            <div>{{ DAY_LABELS[i] }}</div>
            <div class="text-[10px]">{{ day.getDate() }}.</div>
          </div>

          <!-- Auslastungs-Balken -->
          <div class="px-1.5 py-1">
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div
                class="h-full rounded-full transition-all"
                :class="loadColor(trainLoad(day))"
                :style="{ width: `${Math.min(trainLoad(day) * 100, 100)}%` }"
              />
            </div>
            <div class="text-center text-[10px] font-mono text-gray-500 mb-1">
              {{ loadLabel(trainLoad(day)) }}
            </div>
          </div>

          <!-- Buchungskarten -->
          <div class="px-1 pb-2 space-y-1 min-h-[60px]">
            <BookingCard
              v-for="b in dayBookings(day, 'training')"
              :key="b.id"
              :booking="b"
            />
            <div v-if="dayBookings(day, 'training').length === 0" class="text-center text-[10px] text-gray-300 pt-2">
              frei
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hauptfeld -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="bg-brand-dark px-4 py-2 flex items-center gap-2">
        <span class="text-white text-sm font-bold">🏆 Hauptfeld</span>
        <span class="text-white/40 text-xs">(wird bei voller Auslastung freigeschaltet)</span>
      </div>
      <div class="grid grid-cols-7 divide-x divide-gray-100">
        <div v-for="(day, i) in days" :key="i" class="flex flex-col">
          <!-- Tag-Header -->
          <div
            class="text-center py-1.5 text-xs font-semibold border-b border-gray-100"
            :class="isToday(day) ? 'bg-brand-gold/20 text-brand-green' : 'text-gray-500'"
          >
            <div>{{ DAY_LABELS[i] }}</div>
            <div class="text-[10px]">{{ day.getDate() }}.</div>
          </div>

          <!-- Hauptfeld Inhalt -->
          <div class="px-1 py-2 space-y-1 min-h-[80px] flex flex-col">
            <template v-if="dayBookings(day, 'main').length > 0">
              <BookingCard
                v-for="b in dayBookings(day, 'main')"
                :key="b.id"
                :booking="b"
              />
            </template>
            <template v-else>
              <div class="flex-1 flex items-center justify-center text-lg">
                {{ trainLoad(day) >= 1.0 ? '✅' : '🔒' }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Legende -->
    <div class="flex flex-wrap gap-4 text-xs text-gray-500 px-1">
      <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Platz frei</span>
      <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Fast voll (3/4)</span>
      <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Voll → Hauptfeld frei</span>
      <span class="flex items-center gap-1">🔒 Hauptfeld gesperrt</span>
      <span class="flex items-center gap-1">✅ Hauptfeld buchbar</span>
    </div>
  </div>
</template>
