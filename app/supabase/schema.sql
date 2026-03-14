-- ============================================================
-- 47er Trainingsplan – Supabase Schema
-- ============================================================

-- Buchungen
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name    TEXT NOT NULL,
  first_name   TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('training', 'match')),
  pitch_id     TEXT NOT NULL CHECK (pitch_id IN ('training', 'main')),
  area_sq      NUMERIC NOT NULL CHECK (area_sq IN (0.25, 0.5, 1.0)),
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ NOT NULL,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ical')),
  external_uid TEXT UNIQUE,  -- iCal UID zur Deduplizierung
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT end_after_start CHECK (end_at > start_at)
);

-- Index für Verfügbarkeitsabfragen
CREATE INDEX IF NOT EXISTS idx_bookings_pitch_time
  ON bookings (pitch_id, start_at, end_at);

-- Index für Wochenansicht (nach Datum)
CREATE INDEX IF NOT EXISTS idx_bookings_start
  ON bookings (start_at);


-- ============================================================
-- Funktion: Trainingsplatz-Auslastung für einen Zeitraum
-- Gibt die Summe aller gebuchten area_sq zurück (max 1.0 = 4/4)
-- ============================================================
CREATE OR REPLACE FUNCTION training_pitch_load(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(area_sq), 0)
  FROM bookings
  WHERE pitch_id = 'training'
    AND start_at < p_end
    AND end_at   > p_start;
$$ LANGUAGE sql STABLE;


-- ============================================================
-- Realtime aktivieren (für Live-Updates im Frontend)
-- ============================================================
ALTER TABLE bookings REPLICA IDENTITY FULL;


-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Jeder darf lesen
CREATE POLICY "public_read" ON bookings
  FOR SELECT USING (true);

-- Jeder darf einfügen (kein Login-System)
CREATE POLICY "public_insert" ON bookings
  FOR INSERT WITH CHECK (true);

-- Löschen & Bearbeiten nur via Service Key (Admin-PIN wird im Server geprüft)
CREATE POLICY "service_delete" ON bookings
  FOR DELETE USING (auth.role() = 'service_role');

CREATE POLICY "service_update" ON bookings
  FOR UPDATE USING (auth.role() = 'service_role');
