-- 048_delete_demo_customer_data.sql
-- Löscht alle Demo-Kundendaten (Beispiel-Leads, Calls, Analysen, Termine).
-- Die Demo-Reviewer Rolle und is_demo Spalten bleiben erhalten.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════
-- Reihenfolge: Child-Tabellen zuerst (Foreign Key Constraints)
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Voice Call Events (referenziert voice_calls)
DELETE FROM voice_call_events
WHERE call_id IN (SELECT id FROM voice_calls WHERE is_demo = true);

-- 2. Voice Appointments
DELETE FROM voice_appointments
WHERE is_demo = true;

-- 3. Voice Call Analyses
DELETE FROM voice_call_analyses
WHERE is_demo = true;

-- 4. Voice Leads
DELETE FROM voice_leads
WHERE is_demo = true;

-- 5. Voice Calls
DELETE FROM voice_calls
WHERE is_demo = true;

COMMIT;
