import ical from 'node-ical'

export type IcalEvent = {
  external_uid: string
  team_name:    string
  first_name:   string
  type:         'match'
  pitch_id:     'main'
  area_sq:      1.0
  start_at:     string
  end_at:       string
  source:       'ical'
}

export async function parseIcalFeed(url: string, teamName: string): Promise<IcalEvent[]> {
  // webcal:// → https://
  const httpUrl = url.replace(/^webcal:\/\//i, 'https://')

  let events: Awaited<ReturnType<typeof ical.fromURL>>
  try {
    events = await ical.fromURL(httpUrl)
  } catch (e) {
    console.error(`iCal fetch fehlgeschlagen für ${teamName}:`, e)
    return []
  }

  return Object.values(events)
    .filter((e): e is ical.VEvent => e.type === 'VEVENT' && !!e.start && !!e.end)
    .map(e => ({
      external_uid: e.uid ?? `${teamName}-${e.start}`,
      team_name:    teamName,
      first_name:   'System',
      type:         'match',
      pitch_id:     'main',
      area_sq:      1.0,
      start_at:     (e.start as Date).toISOString(),
      end_at:       (e.end as Date).toISOString(),
      source:       'ical',
    }))
}
