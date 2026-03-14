# Implementierungsplan: FC Lokal – Platzbelegungs-App

> Slogan: **47allez**

---

## 1. Projektübersicht

| Attribut | Wert |
|---|---|
| Framework | Nuxt 3 |
| Styling | Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + Realtime) |
| Hosting | Vercel |
| Cron | Vercel Cron Jobs |

---

## 2. Datenstruktur (Supabase Schema)

### Tabelle: `bookings`

```sql
CREATE TABLE bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name   TEXT NOT NULL,
  first_name  TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('training', 'match')),
  pitch_id    TEXT NOT NULL CHECK (pitch_id IN ('training', 'main')),
  area_sq     NUMERIC NOT NULL CHECK (area_sq IN (0.25, 0.5, 1.0)),
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ical')),
  external_uid TEXT UNIQUE,           -- für iCal-Deduplication
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index für Verfügbarkeits-Queries
CREATE INDEX idx_bookings_pitch_time ON bookings (pitch_id, start_at, end_at);
```

### Business Rule: Hauptfeld-Trigger (DB-Funktion)

```sql
-- Gibt die belegte Kapazität des Trainingsplatzes zurück (max. 4 Einheiten = 4 × 0.25 = 1.0)
CREATE OR REPLACE FUNCTION training_pitch_load(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(area_sq), 0)
  FROM bookings
  WHERE pitch_id = 'training'
    AND start_at < p_end
    AND end_at > p_start;
$$ LANGUAGE sql STABLE;
```

---

## 3. Projektstruktur (Nuxt 3)

```
47er-trainingsplan/
├── server/
│   ├── api/
│   │   ├── bookings/
│   │   │   ├── index.get.ts       # GET: Buchungen abfragen
│   │   │   ├── index.post.ts      # POST: Neue Buchung erstellen
│   │   │   ├── [id].delete.ts     # DELETE: Buchung löschen (mit Admin-PIN)
│   │   │   └── [id].put.ts        # PUT: Buchung bearbeiten (mit Admin-PIN)
│   │   └── availability.get.ts    # GET: Verfügbarkeit + Hauptfeld-Freischaltung
│   ├── routes/
│   │   └── sync-ical.ts           # Manuelle Trigger-Route für Sync
│   └── cron/
│       └── sync-ical.ts           # Vercel Cron: täglicher iCal-Import
├── components/
│   ├── WeekView.vue               # Wochenübersicht (Mobile First)
│   ├── BookingForm.vue            # Buchungsformular
│   ├── PitchLane.vue              # Einzelne Platzspur in der Wochenansicht
│   ├── BookingCard.vue            # Buchungskarte
│   └── AdminModal.vue             # PIN-Eingabe für Admin-Aktionen
├── pages/
│   ├── index.vue                  # Startseite: Wochenübersicht
│   └── buchen.vue                 # Buchungsseite
├── layouts/
│   └── default.vue                # Navbar mit "47allez" Slogan
├── composables/
│   ├── useBookings.ts             # Supabase Realtime Subscription
│   └── useAvailability.ts         # Verfügbarkeits-Logik
└── utils/
    └── ical-parser.ts             # iCal/.ics Parser-Logik
```

---

## 4. Kern-Logik: Verfügbarkeit & Hauptfeld-Trigger

### `server/api/availability.get.ts`

```typescript
// GET /api/availability?start=...&end=...
export default defineEventHandler(async (event) => {
  const { start, end } = getQuery(event)
  const supabase = useSupabase()

  // 1. Trainingsplatz-Auslastung berechnen
  const { data: load } = await supabase
    .rpc('training_pitch_load', { p_start: start, p_end: end })

  const trainingLoad = load ?? 0
  const trainingAvailable = 1.0 - trainingLoad  // verbleibende Kapazität

  // 2. Hauptfeld: nur verfügbar wenn Trainingsplatz VOLL (>= 1.0)
  const mainPitchUnlocked = trainingLoad >= 1.0

  return {
    training: {
      load: trainingLoad,           // z.B. 0.75
      available: trainingAvailable, // z.B. 0.25
      units: {                      // welche Einheiten noch buchbar
        quarter: trainingAvailable >= 0.25,
        half:    trainingAvailable >= 0.5,
        full:    trainingAvailable >= 1.0,
      }
    },
    main: {
      unlocked: mainPitchUnlocked,
      reason: mainPitchUnlocked
        ? 'Trainingsplatz voll – Hauptfeld freigegeben'
        : `Trainingsplatz noch ${Math.round((1.0 - trainingLoad) * 4)}/4 Einheiten frei`
    }
  }
})
```

---

## 5. Buchungsformular-Logik (BookingForm.vue)

```
Formular-Felder:
  1. Vorname (Text)
  2. Teamname (Text)
  3. Datum + Uhrzeit (Start / Ende)
  4. Feldgröße: 1/4 | 1/2 | 1/1
  5. Platz: [Trainingsplatz] / [Hauptfeld – nur aktiv wenn unlocked]

Validierung:
  - Beim Auswählen von Datum/Zeit → /api/availability aufrufen
  - Wenn training.available < gewählte area_sq → Fehler anzeigen
  - Hauptfeld-Option nur rendern wenn main.unlocked === true
  - Sonst: Info-Banner "Hauptfeld wird erst bei voller Auslastung freigeschaltet"
```

---

## 6. Admin-Funktionen (PIN-geschützt)

```typescript
// server/api/bookings/[id].delete.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // PIN aus Umgebungsvariable (ADMIN_PIN in .env / Vercel Environment)
  if (body.pin !== process.env.ADMIN_PIN) {
    throw createError({ statusCode: 403, message: 'Falscher Admin-PIN' })
  }

  const supabase = useSupabase()
  await supabase.from('bookings').delete().eq('id', event.context.params.id)
  return { success: true }
})
```

Kein Login-System: PIN wird nur im Request-Body mitgeschickt, nie gespeichert.

---

## 7. iCal-Sync (OÖFV / ÖFB Feed)

### `utils/ical-parser.ts`

```typescript
import ical from 'node-ical'

export async function parseIcalFeed(url: string) {
  const events = await ical.fromURL(url)
  return Object.values(events)
    .filter(e => e.type === 'VEVENT')
    .map(e => ({
      external_uid: e.uid,
      team_name:    'Spiel (OÖFV)',
      first_name:   'System',
      type:         'match',
      pitch_id:     'main',     // Spiele immer auf Hauptfeld
      area_sq:      1.0,        // Spiele blockieren 1/1 Feld
      start_at:     e.start.toISOString(),
      end_at:       e.end.toISOString(),
      source:       'ical',
    }))
}
```

### `server/cron/sync-ical.ts` (Vercel Cron)

```typescript
// vercel.json: { "crons": [{ "path": "/api/cron/sync-ical", "schedule": "0 4 * * *" }] }
export default defineEventHandler(async () => {
  const feedUrl = process.env.ICAL_FEED_URL
  const events = await parseIcalFeed(feedUrl)
  const supabase = useSupabase()

  // Upsert: Duplikate via external_uid verhindern
  const { error } = await supabase
    .from('bookings')
    .upsert(events, { onConflict: 'external_uid' })

  return { synced: events.length, error }
})
```

---

## 8. iCal-Feeds (OÖFV / Fußball Österreich)

> `webcal://` muss für HTTP-Requests zu `https://` konvertiert werden.

| Team | iCal-URL |
|---|---|
| Kampfmannschaft | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1910807244019129194-T.ics` |
| Reserve | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1910807244019129205-T.ics` |
| U15 | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1930525506990583553-T.ics` |
| U13 | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928340330911360359-T.ics` |
| U11 | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928437706325806109-T.ics` |
| U9 | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928437500167375261-T.ics` |
| U7 | `https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928438032743321403-T.ics` |

### Sync-Logik (Anpassung)

Da es **mehrere Feeds** gibt, wird der Cron-Job alle parallel abfragen:

```typescript
// server/cron/sync-ical.ts
const ICAL_FEEDS = [
  { team: 'Kampfmannschaft', url: process.env.ICAL_KM },
  { team: 'Reserve',         url: process.env.ICAL_RESERVE },
  { team: 'U15',             url: process.env.ICAL_U15 },
  { team: 'U13',             url: process.env.ICAL_U13 },
  { team: 'U11',             url: process.env.ICAL_U11 },
  { team: 'U9',              url: process.env.ICAL_U9 },
  { team: 'U7',              url: process.env.ICAL_U7 },
]

// Alle Feeds parallel abrufen & upserten
const results = await Promise.all(
  ICAL_FEEDS.map(({ team, url }) => parseIcalFeed(url, team))
)
```

### Angepasste Umgebungsvariablen

```env
ICAL_KM=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1910807244019129194-T.ics
ICAL_RESERVE=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1910807244019129205-T.ics
ICAL_U15=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1930525506990583553-T.ics
ICAL_U13=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928340330911360359-T.ics
ICAL_U11=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928437706325806109-T.ics
ICAL_U9=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928437500167375261-T.ics
ICAL_U7=https://www.fussballoesterreich.at/netzwerk/icalendar/670725461856634215_100092~1928438032743321403-T.ics
```

---

## 9. UI/UX – Wochenübersicht

### Design-Prinzipien
- **Mobile First**: Spalten-Layout, swipeable Woche
- **Sportliches Farbschema**: Dunkelgrün (#1a472a) + Weiß + Akzent Orange/Gelb
- **Slogan "47allez"**: Prominent in der Navbar (groß, fett, mit Vereinsfarbe)

### WeekView-Konzept

```
┌─────────────────────────────────────┐
│  ⚽ FC Lokal    47allez            │  ← Navbar
├───────┬─────────────────────────────┤
│       │ Mo  Di  Mi  Do  Fr  Sa  So  │
├───────┼─────────────────────────────┤
│ Train │ 3/4 2/4 4/4 1/4 ...        │  ← Farbbalken je Belegung
│ platz │ 🟩  🟨  🟥  🟩             │  (grün/gelb/rot)
├───────┼─────────────────────────────┤
│ Haupt │ 🔒  🔒  ⚽  🔒  ...        │  ← 🔒 = gesperrt, ⚽ = Spiel
│ feld  │                             │
└───────┴─────────────────────────────┘
```

Farbcodierung Trainingsplatz:
- 🟩 Grün: 0–2/4 belegt (viel Platz)
- 🟨 Gelb: 3/4 belegt (fast voll)
- 🟥 Rot/Frei: 4/4 belegt → Hauptfeld automatisch freigeschaltet

---

## 10. Umgebungsvariablen

```env
# .env.local / Vercel Environment Variables
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...   # nur für Server-Routes / Cron
ADMIN_PIN=1234                 # globaler Admin-PIN
ICAL_FEED_URL=https://...      # OÖFV iCal-Feed URL
```

---

## 11. Implementierungs-Reihenfolge (Phasen)

### Phase 1 – Fundament (Tag 1–2)
- [ ] Nuxt 3 Projekt initialisieren (`npx nuxi@latest init 47er-trainingsplan`)
- [ ] Tailwind CSS einrichten
- [ ] Supabase-Projekt erstellen & Schema deployen
- [ ] Supabase Client in Nuxt einbinden (`@nuxtjs/supabase`)
- [ ] `.env` konfigurieren

### Phase 2 – Backend-API (Tag 2–3)
- [ ] `GET /api/bookings` – Buchungen abfragen (mit Zeitraum-Filter)
- [ ] `POST /api/bookings` – Buchung erstellen (mit Validierung)
- [ ] `GET /api/availability` – Verfügbarkeit + Hauptfeld-Trigger
- [ ] `DELETE /api/bookings/:id` – Löschen mit PIN
- [ ] `PUT /api/bookings/:id` – Bearbeiten mit PIN

### Phase 3 – Frontend (Tag 3–5)
- [ ] Layout/Navbar mit "47allez" Slogan
- [ ] WeekView-Komponente (Wochenübersicht, Mobile First)
- [ ] PitchLane + BookingCard Komponenten
- [ ] Supabase Realtime-Subscription (useBookings composable)
- [ ] BookingForm mit Verfügbarkeits-Check
- [ ] AdminModal (PIN-Eingabe + Löschen/Bearbeiten)

### Phase 4 – iCal-Sync (Tag 5–6)
- [ ] `node-ical` Package installieren
- [ ] iCal-Parser implementieren
- [ ] Cron-Route erstellen
- [ ] `vercel.json` mit Cron-Schedule konfigurieren
- [ ] OÖFV Feed-URL eintragen & testen

### Phase 5 – Deployment & Feinschliff (Tag 6–7)
- [ ] Vercel-Projekt verbinden (GitHub-Integration)
- [ ] Umgebungsvariablen in Vercel setzen
- [ ] Supabase Row Level Security (RLS) prüfen
- [ ] Mobile-Ansicht testen & optimieren
- [ ] End-to-End-Test: Buchung → Konflikt → Hauptfeld-Freischaltung

---

## 12. Offene Punkte / Entscheidungen

| Punkt | Optionen | Empfehlung |
|---|---|---|
| Zeitslot-Granularität | 30min / 1h / frei wählbar | 30-Minuten-Raster für Einfachheit |
| OÖFV Feed-URL | Manuell eintragen | Als Env-Variable, leicht wechselbar |
| Slogan-Platzierung | Navbar / Footer / Hero | Navbar (immer sichtbar) + Footer |
| Admin-PIN Stärke | 4-stellig / 6-stellig | 4-stellig (niedrige Hemmschwelle) |
| Benachrichtigungen | Keine / Push / E-Mail | Phase 2: optional Push via Supabase |

---

*Erstellt: 2026-03-14 | Projekt: 47er Trainingsplan | Slogan: 47allez*
