<script setup lang="ts">
import type { Booking } from '~/composables/useBookings'

const props = defineProps<{ bookings: Booking[] }>()

const currentWeekStart = ref(getMonday(new Date()))

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const days = computed(() => Array.from({ length: 7 }, (_, i) => {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + i)
  return d
}))

const weekLabel = computed(() => {
  const s = days.value[0]
  const e = days.value[6]
  const fmt = (d: Date) => d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })
  return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`
})

const emit = defineEmits<{ weekChange: [date: Date] }>()

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

function dayBookings(day: Date, pitchId: string): Booking[] {
  const dayStr = day.toISOString().slice(0, 10)
  return props.bookings.filter(b =>
    b.pitch_id === pitchId && b.start_at.slice(0, 10) === dayStr
  )
}

function trainLoad(day: Date): number {
  return dayBookings(day, 'training').reduce((s, b) => s + Number(b.area_sq), 0)
}

function loadColor(load: number): string {
  if (load >= 1.0)  return 'bg-red-500'
  if (load >= 0.75) return 'bg-amber-400'
  if (load >= 0.25) return 'bg-brand-light'
  return 'bg-gray-200'
}

function loadLabel(load: number): string {
  return `${Math.round(load * 4)}/4`
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const isToday    = (d: Date) => d.toDateString() === new Date().toDateString()
</script>

<template>
  <div class="space-y-4">
    <!-- Woche Navigation -->
    <div class="flex items-center justify-between">
      <button
        @click="prevWeek"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors font-bold text-lg"
        aria-label="Vorherige Woche"
      >←</button>
      <span class="text-sm font-semibold text-gray-700">{{ weekLabel }}</span>
      <button
        @click="nextWeek"
        class="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors font-bold text-lg"
        aria-label="Nächste Woche"
      >→</button>
    </div>

    <!-- ═══════════════════════════════ TRAININGSPLATZ ═══════════════════════════════ -->
    <div class="rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Header mit Spielfeld-Optik -->
      <div class="relative bg-brand-green overflow-hidden">
        <!-- Spielfeld-Linien (dekorativ) -->
        <div class="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none">
          <div class="w-24 h-16 border-2 border-white rounded-sm" />
          <div class="absolute w-8 h-8 border-2 border-white rounded-full" />
        </div>
        <!-- Logo zentriert -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/logo.jpeg"
            alt=""
            class="h-8 w-8 rounded-full object-cover opacity-20 border border-white/30"
          />
        </div>
        <div class="relative z-10 px-4 py-2.5 flex items-center gap-2">
          <span class="text-white text-sm font-bold">🏟 Trainingsplatz</span>
        </div>
      </div>

      <div class="grid grid-cols-7 divide-x divide-gray-100 bg-white">
        <div v-for="(day, i) in days" :key="i" class="flex flex-col">
          <!-- Tag-Header -->
          <div
            class="text-center py-1.5 text-xs font-semibold border-b border-gray-100"
            :class="isToday(day) ? 'bg-brand-green/10 text-brand-green' : 'text-gray-500 bg-gray-50'"
          >
            <div>{{ DAY_LABELS[i] }}</div>
            <div class="text-[10px]">{{ day.getDate() }}.</div>
          </div>

          <!-- Auslastungs-Balken -->
          <div class="px-1.5 py-1.5">
            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="loadColor(trainLoad(day))"
                :style="{ width: `${Math.min(trainLoad(day) * 100, 100)}%` }"
              />
            </div>
            <div class="text-center text-[10px] font-mono text-gray-400">
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
            <div v-if="!dayBookings(day, 'training').length" class="text-center text-[10px] text-gray-300 pt-2">
              frei
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════ HAUPTFELD ═══════════════════════════════ -->
    <div class="rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Header mit Logo in der Mitte -->
      <div class="relative bg-brand-dark overflow-hidden">
        <!-- Spielfeld-Linien im Header -->
        <svg class="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 60" preserveAspectRatio="none">
          <!-- Mittelkreis -->
          <circle cx="200" cy="30" r="20" fill="none" stroke="white" stroke-width="1.5"/>
          <!-- Mittellinie -->
          <line x1="200" y1="0" x2="200" y2="60" stroke="white" stroke-width="1.5"/>
          <!-- Strafräume -->
          <rect x="10" y="10" width="50" height="40" fill="none" stroke="white" stroke-width="1.5"/>
          <rect x="340" y="10" width="50" height="40" fill="none" stroke="white" stroke-width="1.5"/>
        </svg>

        <!-- Logo in der Mitte -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/logo.jpeg"
            alt="U-Haag/H"
            class="h-9 w-9 rounded-full object-cover border-2 border-white/30 shadow-lg opacity-40"
          />
        </div>

        <div class="relative z-10 px-4 py-2.5 flex items-center gap-2">
          <span class="text-white text-sm font-bold">🏆 Hauptfeld</span>
          <span class="text-white/40 text-[11px]">— wird bei 4/4 Auslastung freigeschaltet</span>
        </div>
      </div>

      <div class="grid grid-cols-7 divide-x divide-gray-100 bg-white">
        <div v-for="(day, i) in days" :key="i" class="flex flex-col">
          <!-- Tag-Header -->
          <div
            class="text-center py-1.5 text-xs font-semibold border-b border-gray-100"
            :class="isToday(day) ? 'bg-brand-green/10 text-brand-green' : 'text-gray-500 bg-gray-50'"
          >
            <div>{{ DAY_LABELS[i] }}</div>
            <div class="text-[10px]">{{ day.getDate() }}.</div>
          </div>

          <!-- Hauptfeld-Inhalt -->
          <div class="px-1 py-2 space-y-1 min-h-[80px] flex flex-col">
            <template v-if="dayBookings(day, 'main').length">
              <BookingCard
                v-for="b in dayBookings(day, 'main')"
                :key="b.id"
                :booking="b"
              />
            </template>
            <template v-else>
              <div class="flex-1 flex items-center justify-center">
                <span class="text-xl" :title="trainLoad(day) >= 1.0 ? 'Buchbar' : 'Gesperrt'">
                  {{ trainLoad(day) >= 1.0 ? '✅' : '🔒' }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Legende -->
    <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-400 px-1 pt-1">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-brand-light inline-block"></span>Trainingsplatz frei</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>Fast voll (3/4)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>Voll → Hauptfeld frei</span>
      <span class="flex items-center gap-1.5">🔒 Hauptfeld gesperrt</span>
      <span class="flex items-center gap-1.5">✅ Hauptfeld buchbar</span>
    </div>
  </div>
</template>
