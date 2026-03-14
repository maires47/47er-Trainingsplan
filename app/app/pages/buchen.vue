<script setup lang="ts">
const router = useRouter()

function onBooked() {
  setTimeout(() => router.push('/'), 1500)
}
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div class="mb-6">
      <NuxtLink to="/" class="text-sm text-gray-400 hover:text-brand-green transition-colors">
        ← Zurück zur Übersicht
      </NuxtLink>
    </div>
    <BookingForm @booked="onBooked" />
  </div>
</template>
