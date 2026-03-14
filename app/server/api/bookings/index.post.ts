import { serverSupabaseServiceRole } from '#supabase/server'

// POST /api/bookings
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Pflichtfelder prüfen
  const required = ['team_name', 'first_name', 'pitch_id', 'area_sq', 'start_at', 'end_at']
  for (const field of required) {
    if (!body[field]) throw createError({ statusCode: 400, message: `Feld '${field}' fehlt` })
  }

  // area_sq validieren
  if (![0.25, 0.5, 1.0].includes(Number(body.area_sq))) {
    throw createError({ statusCode: 400, message: 'area_sq muss 0.25, 0.5 oder 1.0 sein' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const start = new Date(body.start_at)
  const end   = new Date(body.end_at)

  // Verfügbarkeit prüfen
  const { data: load } = await supabase
    .rpc('training_pitch_load', { p_start: start.toISOString(), p_end: end.toISOString() })

  const trainingLoad = Number(load ?? 0)

  if (body.pitch_id === 'training') {
    const available = 1.0 - trainingLoad
    if (Number(body.area_sq) > available + 0.001) {
      throw createError({
        statusCode: 409,
        message: `Trainingsplatz nur noch zu ${Math.round(available * 4)}/4 verfügbar`
      })
    }
  }

  if (body.pitch_id === 'main' && trainingLoad < 1.0) {
    throw createError({
      statusCode: 409,
      message: 'Hauptfeld ist erst buchbar wenn Trainingsplatz voll (4/4) belegt ist'
    })
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      team_name:  body.team_name,
      first_name: body.first_name,
      type:       body.type ?? 'training',
      pitch_id:   body.pitch_id,
      area_sq:    Number(body.area_sq),
      start_at:   start.toISOString(),
      end_at:     end.toISOString(),
      source:     'manual',
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
