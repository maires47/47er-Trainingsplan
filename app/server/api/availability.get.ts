// GET /api/availability?start=...&end=...
export default defineEventHandler(async (event) => {
  const { start, end } = getQuery(event)

  if (!start || !end) {
    throw createError({ statusCode: 400, message: 'start und end sind erforderlich' })
  }

  const supabase = useSupabaseClient()

  const { data: load, error } = await supabase
    .rpc('training_pitch_load', { p_start: start, p_end: end })

  if (error) throw createError({ statusCode: 500, message: error.message })

  const trainingLoad      = Number(load ?? 0)
  const trainingAvailable = Math.max(0, 1.0 - trainingLoad)
  const mainUnlocked      = trainingLoad >= 1.0

  return {
    training: {
      load:      trainingLoad,
      available: trainingAvailable,
      units: {
        quarter: trainingAvailable >= 0.25,
        half:    trainingAvailable >= 0.5,
        full:    trainingAvailable >= 1.0,
      },
    },
    main: {
      unlocked: mainUnlocked,
      message: mainUnlocked
        ? 'Hauptfeld freigegeben – Trainingsplatz voll'
        : `Noch ${Math.round(trainingAvailable * 4)}/4 Einheiten am Trainingsplatz frei`,
    },
  }
})
