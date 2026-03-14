// PUT /api/bookings/:id  (erfordert Admin-PIN im Body)
export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  const config = useRuntimeConfig()

  if (!body?.pin || body.pin !== config.adminPin) {
    throw createError({ statusCode: 403, message: 'Falscher Admin-PIN' })
  }

  const { pin: _pin, ...updates } = body

  const supabase = useSupabaseService()
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
