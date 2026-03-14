// DELETE /api/bookings/:id  (erfordert Admin-PIN im Body)
export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)
  const config = useRuntimeConfig()

  if (!body?.pin || body.pin !== config.adminPin) {
    throw createError({ statusCode: 403, message: 'Falscher Admin-PIN' })
  }

  // Service-Client umgeht RLS für Delete
  const supabase = useSupabaseService()
  const { error } = await supabase.from('bookings').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
