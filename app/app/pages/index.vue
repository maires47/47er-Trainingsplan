<script setup lang="ts">
const { bookings, loading, fetchWeek, subscribe } = useBookings()

const currentWeekStart = ref(getMonday(new Date()))

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day  = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

onMounted(async () => {
  await fetchWeek(currentWeekStart.value)
  const channel = subscribe(currentWeekStart.value)
  onUnmounted(() => channel.unsubscribe())
})

async function onWeekChange(date: Date) {
  currentWeekStart.value = date
  await fetchWeek(date)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-black text-brand-green">Platzbelegung</h1>
        <p class="text-sm text-gray-400">Live-Übersicht aller Buchungen</p>
      </div>
      <NuxtLink
        to="/buchen"
        class="bg-brand-gold text-brand-dark px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
      >
        + Buchen
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">
      <div class="text-4xl mb-2">⚽</div>
      <div class="text-sm">Lade Buchungen…</div>
    </div>

    <WeekView
      v-else
      :bookings="bookings"
      @week-change="onWeekChange"
    />
  </div>
</template>
