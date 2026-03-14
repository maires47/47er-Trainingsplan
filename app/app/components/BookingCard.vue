<script setup lang="ts">
import type { Booking } from '~/composables/useBookings'

const props = defineProps<{
  booking: Booking
  onDelete?: () => void
}>()

const areaLabel: Record<string, string> = {
  '0.25': '1/4',
  '0.5':  '1/2',
  '1':    '1/1',
}

const label = computed(() => areaLabel[String(props.booking.area_sq)] ?? '1/1')

const startTime = computed(() =>
  new Date(props.booking.start_at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
)
const endTime = computed(() =>
  new Date(props.booking.end_at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
)
</script>

<template>
  <div
    class="rounded-lg px-2.5 py-1.5 text-xs leading-tight border"
    :class="booking.pitch_id === 'main'
      ? 'bg-amber-50 border-amber-300 text-amber-900'
      : 'bg-green-50 border-green-300 text-green-900'"
  >
    <div class="font-bold truncate">{{ booking.team_name }}</div>
    <div class="text-[11px] opacity-70">{{ startTime }}–{{ endTime }} · {{ label }}</div>
    <div v-if="booking.source === 'ical'" class="text-[10px] mt-0.5 opacity-50">📅 OÖFV</div>
  </div>
</template>
