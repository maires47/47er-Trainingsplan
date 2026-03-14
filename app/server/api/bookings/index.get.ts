import { serverSupabaseServiceRole } from '#supabase/server'

// GET /api/bookings?from=2024-01-01&to=2024-01-07
export default defineEventHandler(async (event) => {
  const { from, to } = getQuery(event)
  const supabase = serverSupabaseServiceRole(event)

  let query = supabase
    .from('bookings')
    .select('*')
    .order('start_at', { ascending: true })

  if (from) query = query.gte('start_at', from)
  if (to)   query = query.lte('start_at', to)

  const { data, error } = await query

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
