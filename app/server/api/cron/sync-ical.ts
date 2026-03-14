// GET /api/cron/sync-ical
// Wird täglich via Vercel Cron aufgerufen (vercel.json)
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const feeds = [
    { team: 'Kampfmannschaft', url: config.icalKm },
    { team: 'Reserve',         url: config.icalReserve },
    { team: 'U15',             url: config.icalU15 },
    { team: 'U13',             url: config.icalU13 },
    { team: 'U11',             url: config.icalU11 },
    { team: 'U9',              url: config.icalU9 },
    { team: 'U7',              url: config.icalU7 },
  ].filter(f => !!f.url)

  // Alle Feeds parallel abrufen
  const results = await Promise.allSettled(
    feeds.map(({ team, url }) => parseIcalFeed(url, team))
  )

  const allEvents = results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value
    console.error(`Sync fehlgeschlagen für ${feeds[i].team}:`, r.reason)
    return []
  })

  if (allEvents.length === 0) {
    return { synced: 0, message: 'Keine Events gefunden' }
  }

  // Service-Client für Upsert (umgeht RLS)
  const supabase = useSupabaseService()
  const { error, count } = await supabase
    .from('bookings')
    .upsert(allEvents, { onConflict: 'external_uid', count: 'exact' })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    synced:  count ?? allEvents.length,
    feeds:   feeds.length,
    message: `${count ?? allEvents.length} Spiele synchronisiert`,
  }
})
