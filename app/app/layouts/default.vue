<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Navbar -->
    <header class="bg-brand-green shadow-lg sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <!-- Logo + Name -->
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <span class="text-2xl">⚽</span>
          <div class="flex flex-col leading-none">
            <span class="text-white font-bold text-sm tracking-wide">FC Lokal</span>
            <span class="text-brand-gold font-black text-xs tracking-widest uppercase">47allez</span>
          </div>
        </NuxtLink>

        <!-- Nav Links -->
        <nav class="flex items-center gap-1">
          <NuxtLink
            to="/"
            class="text-white/80 hover:text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-white/10"
            active-class="text-white bg-white/15"
          >
            Übersicht
          </NuxtLink>
          <NuxtLink
            to="/buchen"
            class="bg-brand-gold text-brand-dark px-3 py-1.5 rounded-md text-sm font-bold transition-opacity hover:opacity-90"
          >
            + Buchen
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Page Content -->
    <main class="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-brand-dark text-white/40 text-center text-xs py-3">
      47allez &mdash; FC Lokal Trainingsplanung
    </footer>
  </div>
</template>
