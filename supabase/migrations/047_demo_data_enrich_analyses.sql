-- ============================================================
-- Migration 047: Enrich Demo Data — Analyses + Events + Profile
-- ============================================================
-- Adds realistic demo data so Everlast AI reviewer can see
-- a populated backend. ALL data has is_demo=true for easy cleanup.
--
-- CLEANUP: DELETE FROM voice_call_analyses WHERE is_demo = true;
--          DELETE FROM voice_call_events WHERE call_id IN (SELECT id FROM voice_calls WHERE is_demo = true);
--          DELETE FROM voice_appointments WHERE is_demo = true;
--          DELETE FROM voice_leads WHERE is_demo = true;
--          DELETE FROM voice_calls WHERE is_demo = true;
-- ============================================================

BEGIN;

-- ── 1. Link existing demo analyses to their matching demo calls ──

UPDATE voice_call_analyses
SET call_id = '7a3e902d-c9ab-4143-bf6a-290855e375f2'
WHERE id = 'a043da9b-3791-4552-84ba-a874c8c008b0' AND call_id IS NULL;

UPDATE voice_call_analyses
SET call_id = '863d45c0-f2ea-4db0-8068-adf1a6006afd'
WHERE id = 'd342291f-7c4b-4ffb-b2fd-890733a8d50c' AND call_id IS NULL;

UPDATE voice_call_analyses
SET call_id = 'ab95fd56-4c51-4696-b888-0bf9bd0cad8c'
WHERE id = 'fb261b09-9239-46d8-b327-f55dc834b5c9' AND call_id IS NULL;


-- ── 2. Add 5 new analyses for calls that don't have one ──

-- Call b98eb137: FAQ — Ratenzahlung (Klarna)
INSERT INTO voice_call_analyses (
  id, call_id, anrufer_name, anrufer_email, anrufer_telefon,
  sprache, kategorie, thema, anliegen,
  interessiertes_paket, kaufbereitschaft, einwand,
  geburtsdatum_genannt, status, termin_gebucht, termin_datum,
  follow_up_noetig, naechster_schritt, zusammenfassung, is_demo,
  created_at
) VALUES (
  gen_random_uuid(),
  'b98eb137-0fe5-401c-a976-508cdb7608aa',
  'Sandra Hoffmann', NULL, NULL,
  'de', 'FAQ', 'Zahlungsoptionen', 'Frage zu Ratenzahlung und Klarna',
  'keines', 'mittel', 'keiner',
  false, 'FAQ_beantwortet', false, NULL,
  false, 'Keine_Aktion',
  'Kurze FAQ-Anfrage zu Ratenzahlung (Klarna). Keine persoenlichen Daten hinterlassen. Anruferin war zufrieden mit der Auskunft, koennte spaeter zurueckkommen.',
  true,
  NOW() - INTERVAL '6 days'
);

-- Call a0a12aff: FAQ — Psychomatrix vs. klassische Numerologie
INSERT INTO voice_call_analyses (
  id, call_id, anrufer_name, anrufer_email, anrufer_telefon,
  sprache, kategorie, thema, anliegen,
  interessiertes_paket, kaufbereitschaft, einwand,
  geburtsdatum_genannt, status, termin_gebucht, termin_datum,
  follow_up_noetig, naechster_schritt, zusammenfassung, is_demo,
  created_at
) VALUES (
  gen_random_uuid(),
  'a0a12aff-aa92-4e69-9964-aa366db2a508',
  'Michael Braun', 'michael.demo@example.com', NULL,
  'de', 'FAQ', 'Methodik', 'Unterschied Psychomatrix vs. klassische Numerologie',
  'pdf_analyse', 'mittel', 'skeptisch',
  true, 'Interesse_geweckt', false, NULL,
  true, 'Follow_up_Email',
  'Allgemeine FAQ-Anfrage zum Unterschied Psychomatrix vs. klassische Numerologie. Anrufer hat Geburtstag genannt (15.08.1985). Interesse an PDF-Analyse geweckt, aber noch skeptisch. Follow-up Email empfohlen.',
  true,
  NOW() - INTERVAL '5 days'
);

-- Call 5a50c497: PAKETBERATUNG — Karriere-Analyse (Anna Mueller, Grade A)
INSERT INTO voice_call_analyses (
  id, call_id, anrufer_name, anrufer_email, anrufer_telefon,
  sprache, kategorie, thema, anliegen,
  interessiertes_paket, kaufbereitschaft, einwand,
  geburtsdatum_genannt, status, termin_gebucht, termin_datum,
  follow_up_noetig, naechster_schritt, zusammenfassung, is_demo,
  created_at
) VALUES (
  gen_random_uuid(),
  '5a50c497-bb5e-4be4-89cc-1d364f72f196',
  'Anna Mueller', 'anna.demo@example.com', '+49 170 1234567',
  'de', 'PAKETBERATUNG', 'Karriere und Beruf', 'Karriere-Analyse und Lebensbestimmung',
  'lebensbestimmung', 'hoch', 'keiner',
  true, 'Termin_gebucht', true, NOW() + INTERVAL '5 days',
  false, 'Rueckruf_Swetlana',
  'Interessentin fragt nach Psychomatrix und Karriere-Analyse. Hat Geburtsdatum (22.11.1990) und Meisterzahl 22 erwaehnt. Hohe Kaufbereitschaft, Termin fuer Lebensbestimmung gebucht. Sehr engagiert und informiert.',
  true,
  NOW() - INTERVAL '3 days'
);

-- Call 9c9be7ea: PAKETBERATUNG — Beziehungsmatrix (russisch, Мария Петрова)
INSERT INTO voice_call_analyses (
  id, call_id, anrufer_name, anrufer_email, anrufer_telefon,
  sprache, kategorie, thema, anliegen,
  interessiertes_paket, kaufbereitschaft, einwand,
  geburtsdatum_genannt, status, termin_gebucht, termin_datum,
  follow_up_noetig, naechster_schritt, zusammenfassung, is_demo,
  created_at
) VALUES (
  gen_random_uuid(),
  '9c9be7ea-6918-4426-98ba-22ed80f7dadb',
  'Мария Петрова', 'maria.demo@example.com', NULL,
  'ru', 'PAKETBERATUNG', 'Beziehung und Partnerschaft', 'Beziehungsmatrix fuer sich und Partner',
  'beziehungsmatrix', 'mittel', 'muss_ueberlegen',
  true, 'Interesse_geweckt', false, NULL,
  true, 'Follow_up_Email',
  'Russischsprachige Anfrage zu Beziehungsmatrix (99 EUR). Interessiert an Kompatibilitaetsanalyse mit Partner. Hat beide Geburtsdaten genannt. Muss noch mit Partner sprechen — Follow-up in 3 Tagen empfohlen.',
  true,
  NOW() - INTERVAL '2 days'
);

-- Call 9207f7c7: Missed call — minimal analysis
INSERT INTO voice_call_analyses (
  id, call_id, anrufer_name, anrufer_email, anrufer_telefon,
  sprache, kategorie, thema, anliegen,
  interessiertes_paket, kaufbereitschaft, einwand,
  geburtsdatum_genannt, status, termin_gebucht, termin_datum,
  follow_up_noetig, naechster_schritt, zusammenfassung, is_demo,
  created_at
) VALUES (
  gen_random_uuid(),
  '9207f7c7-1b65-442a-ae1c-715453377e31',
  NULL, NULL, NULL,
  'de', 'Allgemein', 'Allgemein', NULL,
  'keines', 'unklar', 'keiner',
  false, 'Abgebrochen', false, NULL,
  false, 'Keine_Aktion',
  'Verpasster Anruf — Verbindung vor Gespraechsbeginn abgebrochen. Keine Daten erfasst.',
  true,
  NOW() - INTERVAL '8 days'
);


-- ── 3. Add call events for all demo calls (KPI timeline) ──

-- Call 7a3e902d (skeptisch, 92s)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('7a3e902d-c9ab-4143-bf6a-290855e375f2', 'greeting', 0, '{}'),
  ('7a3e902d-c9ab-4143-bf6a-290855e375f2', 'qualification', 15, '{"question_snippet": "Was interessiert Sie an der Numerologie?"}'),
  ('7a3e902d-c9ab-4143-bf6a-290855e375f2', 'objection', 45, '{"objection_text": "Ich bin da eher skeptisch, das klingt wie Hokuspokus"}'),
  ('7a3e902d-c9ab-4143-bf6a-290855e375f2', 'drop_off', 92, '{"last_phase": "objection"}');

-- Call b98eb137 (Ratenzahlung FAQ, 85s)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('b98eb137-0fe5-401c-a976-508cdb7608aa', 'greeting', 0, '{}'),
  ('b98eb137-0fe5-401c-a976-508cdb7608aa', 'qualification', 12, '{"question_snippet": "Wie kann ich Ihnen helfen?"}');

-- Call a0a12aff (Psychomatrix FAQ, 124s)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('a0a12aff-aa92-4e69-9964-aa366db2a508', 'greeting', 0, '{}'),
  ('a0a12aff-aa92-4e69-9964-aa366db2a508', 'qualification', 18, '{"question_snippet": "Was genau ist der Unterschied zwischen Psychomatrix und klassischer Numerologie?"}');

-- Call 863d45c0 (Jahresprognose, ru, 175s)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('863d45c0-f2ea-4db0-8068-adf1a6006afd', 'greeting', 0, '{}'),
  ('863d45c0-f2ea-4db0-8068-adf1a6006afd', 'qualification', 20, '{"question_snippet": "Какой пакет вас интересует?"}'),
  ('863d45c0-f2ea-4db0-8068-adf1a6006afd', 'booking_attempt', 140, '{}');

-- Call 5a50c497 (Karriere-Analyse, 285s — Anna Mueller Grade A)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('5a50c497-bb5e-4be4-89cc-1d364f72f196', 'greeting', 0, '{}'),
  ('5a50c497-bb5e-4be4-89cc-1d364f72f196', 'qualification', 25, '{"question_snippet": "Was genau moechten Sie ueber Ihre Karriere erfahren?"}'),
  ('5a50c497-bb5e-4be4-89cc-1d364f72f196', 'qualification', 90, '{"question_snippet": "Haben Sie schon Erfahrung mit Numerologie?"}'),
  ('5a50c497-bb5e-4be4-89cc-1d364f72f196', 'booking_attempt', 200, '{}');

-- Call ab95fd56 (Meisterzahl 22, 320s — Julia Weber Grade A)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('ab95fd56-4c51-4696-b888-0bf9bd0cad8c', 'greeting', 0, '{}'),
  ('ab95fd56-4c51-4696-b888-0bf9bd0cad8c', 'qualification', 30, '{"question_snippet": "Was hat Sie zu Numerologie gebracht?"}'),
  ('ab95fd56-4c51-4696-b888-0bf9bd0cad8c', 'qualification', 120, '{"question_snippet": "Sie haben die Meisterzahl 22 — wussten Sie das?"}'),
  ('ab95fd56-4c51-4696-b888-0bf9bd0cad8c', 'booking_attempt', 250, '{}');

-- Call 9c9be7ea (Beziehungsmatrix, ru, 198s)
INSERT INTO voice_call_events (call_id, event_type, timestamp_seconds, metadata) VALUES
  ('9c9be7ea-6918-4426-98ba-22ed80f7dadb', 'greeting', 0, '{}'),
  ('9c9be7ea-6918-4426-98ba-22ed80f7dadb', 'qualification', 22, '{"question_snippet": "Для чего вам нужна матрица отношений?"}'),
  ('9c9be7ea-6918-4426-98ba-22ed80f7dadb', 'objection', 150, '{"objection_text": "Мне надо подумать, это не дешево"}');


-- ── 4. Set demo user profile name ──

UPDATE profiles
SET full_name = 'Demo Reviewer'
WHERE email = 'demo@wagner-aigentur.com' AND full_name IS NULL;


-- ── 5. Spread demo call created_at for realistic timeline ──
-- (So charts show data spread across days, not all on one day)

UPDATE voice_calls SET created_at = NOW() - INTERVAL '8 days'  WHERE id = '9207f7c7-1b65-442a-ae1c-715453377e31';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '7 days'  WHERE id = '7a3e902d-c9ab-4143-bf6a-290855e375f2';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '6 days'  WHERE id = 'b98eb137-0fe5-401c-a976-508cdb7608aa';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '5 days'  WHERE id = 'a0a12aff-aa92-4e69-9964-aa366db2a508';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '4 days'  WHERE id = '863d45c0-f2ea-4db0-8068-adf1a6006afd';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '3 days'  WHERE id = '5a50c497-bb5e-4be4-89cc-1d364f72f196';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '2 days'  WHERE id = 'ab95fd56-4c51-4696-b888-0bf9bd0cad8c';
UPDATE voice_calls SET created_at = NOW() - INTERVAL '1 day'   WHERE id = '9c9be7ea-6918-4426-98ba-22ed80f7dadb';

COMMIT;
