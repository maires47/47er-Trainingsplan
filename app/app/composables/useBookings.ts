export type Booking = {
  id: string
  team_name: string
  first_name: string
  type: 'training' | 'match'
  pitch_id: 'training' | 'main'
  area_sq: 0.25 | 0.5 | 1.0
  start_at: string
  end_at: string
  source: 'manual' | 'ical'
  created_at: string
}

export function useBookings() {
  const supabase = useSupabaseClient()
  const bookings = ref<Booking[]>([])
  const loading  = ref(false)

  async function fetchWeek(startOfWeek: Date) {
    loading.value = true
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('start_at', startOfWeek.toISOString())
      .lt('start_at', endOfWeek.toISOString())
      .order('start_at', { ascending: true })

    if (!error && data) bookings.value = data as Booking[]
    loading.value = false
  }

  // Realtime-Subscription für Live-Updates
  function subscribe(startOfWeek: Date) {
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    return supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchWeek(startOfWeek)
      })
      .subscribe()
  }

  return { bookings, loading, fetchWeek, subscribe }
}
