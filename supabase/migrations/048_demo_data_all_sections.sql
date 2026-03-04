-- ============================================================
-- Migration 048: Demo Data for ALL Admin Sections
-- ============================================================
-- Adds realistic demo data across all admin pages so the
-- Everlast AI reviewer can explore the full backend.
-- ALL data has is_demo=true for easy cleanup.
--
-- CLEANUP:
--   DELETE FROM email_log WHERE is_demo = true;
--   DELETE FROM sessions WHERE is_demo = true;
--   DELETE FROM orders WHERE is_demo = true;
--   DELETE FROM contact_submissions WHERE is_demo = true;
--   DELETE FROM profiles WHERE is_demo = true;
-- ============================================================

BEGIN;

-- ── 1. Add is_demo column to all relevant tables ──

ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Partial indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_contact_submissions_demo ON contact_submissions(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_orders_demo ON orders(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_sessions_demo ON public.sessions(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_email_log_demo ON email_log(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_profiles_demo ON profiles(is_demo) WHERE is_demo = true;


-- ── 2. Demo Customer Profiles (5 fake customers) ──
-- Temporarily drop FK so we can insert profiles without auth.users entries

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO profiles (id, email, full_name, phone, language, crm_status, source, is_demo, created_at, marketing_consent, unsubscribe_token)
VALUES
  ('d0000001-de00-4000-a000-000000000001', 'anna.mueller@example.com', 'Anna Mueller',
   '+49 151 12345678', 'de', 'client', 'voice_agent', true,
   NOW() - INTERVAL '14 days', true, 'de000001-0000-4000-a000-000000000001'),

  ('d0000002-de00-4000-a000-000000000002', 'julia.weber@example.com', 'Julia Weber',
   '+49 172 44455566', 'de', 'client', 'website', true,
   NOW() - INTERVAL '10 days', true, 'de000002-0000-4000-a000-000000000002'),

  ('d0000003-de00-4000-a000-000000000003', 'thomas.schmidt@example.com', 'Thomas Schmidt',
   '+49 170 11122233', 'de', 'lead', 'voice_agent', true,
   NOW() - INTERVAL '7 days', false, 'de000003-0000-4000-a000-000000000003'),

  ('d0000004-de00-4000-a000-000000000004', 'maria.petrova@example.com', 'Мария Петрова',
   '+49 176 98765432', 'ru', 'client', 'instagram', true,
   NOW() - INTERVAL '12 days', true, 'de000004-0000-4000-a000-000000000004'),

  ('d0000005-de00-4000-a000-000000000005', 'elena.ivanova@example.com', 'Елена Иванова',
   '+49 157 77788899', 'ru', 'lead', 'website', true,
   NOW() - INTERVAL '5 days', true, 'de000005-0000-4000-a000-000000000005')
ON CONFLICT (id) DO NOTHING;

-- Re-add FK (NOT VALID skips validation of existing orphan rows)
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;


-- ── 3. Demo Contact Submissions (6 entries) ──

INSERT INTO contact_submissions (name, email, phone, message, topic, status, language, is_demo, created_at)
VALUES
  ('Anna Mueller', 'anna.mueller@example.com', '+49 151 12345678',
   'Hallo, ich interessiere mich fuer eine Numerologie-Beratung zum Thema Karriere. Mein Geburtsdatum ist der 15.03.1988. Koennen Sie mir mehr ueber die verschiedenen Pakete erzaehlen?',
   'career', 'replied', 'de', true, NOW() - INTERVAL '12 days'),

  ('Julia Weber', 'julia.weber@example.com', '+49 172 44455566',
   'Guten Tag, ich wuerde gerne eine Lebensbestimmung-Beratung buchen. Ich bin am 22.11.1991 geboren und stehe an einem Wendepunkt in meinem Leben. Wann haetten Sie Zeit?',
   'growth', 'new', 'de', true, NOW() - INTERVAL '3 days'),

  ('Thomas Schmidt', 'thomas.schmidt@example.com', NULL,
   'Hallo, ich habe eine Frage zu den Preisen. Was kostet eine vollstaendige Analyse? Gibt es auch Ratenzahlung ueber Klarna?',
   'career', 'read', 'de', true, NOW() - INTERVAL '8 days'),

  ('Мария Петрова', 'maria.petrova@example.com', '+49 176 98765432',
   'Здравствуйте! Мне интересна матрица отношений для меня и моего партнёра. Мы хотели бы узнать нашу совместимость. Можно записаться на консультацию?',
   'relationships', 'replied', 'ru', true, NOW() - INTERVAL '10 days'),

  ('Елена Иванова', 'elena.ivanova@example.com', '+49 157 77788899',
   'Добрый день! Меня интересует годовой прогноз на 2026 год. У меня день рождения 04.07.1990. Какие у вас есть варианты?',
   'growth', 'new', 'ru', true, NOW() - INTERVAL '2 days'),

  ('Sandra Hoffmann', 'sandra.hoffmann@example.com', '+49 163 22233344',
   'Hallo! Ich moechte gerne eine Beratung fuer mein Kind buchen. Mein Sohn ist am 01.09.2015 geboren und hat Schwierigkeiten in der Schule. Kann die Numerologie dabei helfen?',
   'children', 'archived', 'de', true, NOW() - INTERVAL '20 days');


-- ── 4. Demo Orders (5 entries) ──

INSERT INTO orders (id, customer_email, amount_cents, currency, status, metadata, profile_id, is_demo, created_at, paid_at)
VALUES
  ('d1000001-de00-4000-a000-000000000001',
   'anna.mueller@example.com', 2900, 'eur', 'paid',
   '{"package_key": "birthday-code", "product_name": "Geburtstagscode PDF-Analyse"}'::jsonb,
   'd0000001-de00-4000-a000-000000000001', true,
   NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),

  ('d1000002-de00-4000-a000-000000000002',
   'julia.weber@example.com', 24900, 'eur', 'paid',
   '{"package_key": "lebensbestimmung", "product_name": "Lebensbestimmung Beratung (90 Min)"}'::jsonb,
   'd0000002-de00-4000-a000-000000000002', true,
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

  ('d1000003-de00-4000-a000-000000000003',
   'maria.petrova@example.com', 9900, 'eur', 'paid',
   '{"package_key": "beziehungsmatrix", "product_name": "Beziehungsmatrix Partneranalyse"}'::jsonb,
   'd0000004-de00-4000-a000-000000000004', true,
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

  ('d1000004-de00-4000-a000-000000000004',
   'elena.ivanova@example.com', 2900, 'eur', 'pending',
   '{"package_key": "year-forecast", "product_name": "Jahresprognose 2026 PDF"}'::jsonb,
   'd0000005-de00-4000-a000-000000000005', true,
   NOW() - INTERVAL '1 day', NULL),

  ('d1000005-de00-4000-a000-000000000005',
   'thomas.schmidt@example.com', 2900, 'eur', 'cancelled',
   '{"package_key": "selfrealization", "product_name": "Selbstverwirklichung PDF-Analyse"}'::jsonb,
   'd0000003-de00-4000-a000-000000000003', true,
   NOW() - INTERVAL '6 days', NULL);


-- ── 5. Demo Sessions (5 entries) ──

INSERT INTO public.sessions (id, profile_id, title, status, session_type, order_id, package_type, platform, duration_minutes, scheduled_at, meeting_link, admin_notes, is_demo, created_at)
VALUES
  -- Anna: paid, completed (birthday-code Besprechung)
  ('d2000001-de00-4000-a000-000000000001',
   'd0000001-de00-4000-a000-000000000001',
   'Geburtstagscode Besprechung', 'completed', 'paid',
   'd1000001-de00-4000-a000-000000000001',
   'birthday-code', 'Zoom', 30,
   NOW() - INTERVAL '9 days',
   'https://zoom.us/j/demo-numerologie-001',
   'Sehr engagierte Kundin. Meisterzahl 22 erkannt — hohes Potenzial.',
   true, NOW() - INTERVAL '11 days'),

  -- Julia: paid, scheduled in future (Lebensbestimmung)
  ('d2000002-de00-4000-a000-000000000002',
   'd0000002-de00-4000-a000-000000000002',
   'Lebensbestimmung Beratung', 'scheduled', 'paid',
   'd1000002-de00-4000-a000-000000000002',
   'lebensbestimmung', 'Zoom', 90,
   NOW() + INTERVAL '3 days',
   'https://zoom.us/j/demo-numerologie-002',
   NULL,
   true, NOW() - INTERVAL '5 days'),

  -- Maria: paid, completed (Beziehungsmatrix)
  ('d2000003-de00-4000-a000-000000000003',
   'd0000004-de00-4000-a000-000000000004',
   'Матрица Отношений — Партнерanalyse', 'completed', 'paid',
   'd1000003-de00-4000-a000-000000000003',
   'beziehungsmatrix', 'Google Meet', 60,
   NOW() - INTERVAL '5 days',
   'https://meet.google.com/demo-numerologie-003',
   'Partneranalyse abgeschlossen. Klientin sehr zufrieden mit Ergebnis.',
   true, NOW() - INTERVAL '9 days'),

  -- Elena: free Erstgespraech, scheduled in future
  ('d2000004-de00-4000-a000-000000000004',
   'd0000005-de00-4000-a000-000000000005',
   'Kostenloses Erstgespraech', 'scheduled', 'free',
   NULL,
   'erstgespraech', 'Zoom', 15,
   NOW() + INTERVAL '5 days',
   'https://zoom.us/j/demo-numerologie-004',
   NULL,
   true, NOW() - INTERVAL '2 days'),

  -- Thomas: free Erstgespraech, cancelled
  ('d2000005-de00-4000-a000-000000000005',
   'd0000003-de00-4000-a000-000000000003',
   'Erstgespraech', 'cancelled', 'free',
   NULL,
   'erstgespraech', 'Zoom', 15,
   NOW() - INTERVAL '3 days',
   NULL,
   'Kunde hat abgesagt — kein Interesse nach Preisauskunft.',
   true, NOW() - INTERVAL '7 days');


-- ── 6. Demo E-Mail Log (12 entries) ──

INSERT INTO email_log (to_email, subject, template, status, profile_id, is_demo, created_at)
VALUES
  ('anna.mueller@example.com', 'Willkommen bei Numerologie PRO!', 'welcome', 'sent',
   'd0000001-de00-4000-a000-000000000001', true, NOW() - INTERVAL '14 days'),

  ('anna.mueller@example.com', 'Dein Geburtstagscode PDF ist fertig', 'pdf_delivery', 'sent',
   'd0000001-de00-4000-a000-000000000001', true, NOW() - INTERVAL '11 days'),

  ('anna.mueller@example.com', 'Zusammenfassung deiner Sitzung', 'session_summary', 'sent',
   'd0000001-de00-4000-a000-000000000001', true, NOW() - INTERVAL '9 days'),

  ('julia.weber@example.com', 'Willkommen bei Numerologie PRO!', 'welcome', 'sent',
   'd0000002-de00-4000-a000-000000000002', true, NOW() - INTERVAL '10 days'),

  ('julia.weber@example.com', 'Bestaetigung: Lebensbestimmung Beratung', 'booking_confirmation', 'sent',
   'd0000002-de00-4000-a000-000000000002', true, NOW() - INTERVAL '5 days'),

  ('julia.weber@example.com', 'Erinnerung: Dein Termin in 3 Tagen', 'session_reminder', 'sent',
   'd0000002-de00-4000-a000-000000000002', true, NOW() - INTERVAL '1 day'),

  ('maria.petrova@example.com', 'Добро пожаловать в Numerologie PRO!', 'welcome', 'sent',
   'd0000004-de00-4000-a000-000000000004', true, NOW() - INTERVAL '12 days'),

  ('maria.petrova@example.com', 'Ваша матрица отношений готова', 'pdf_delivery', 'sent',
   'd0000004-de00-4000-a000-000000000004', true, NOW() - INTERVAL '5 days'),

  ('elena.ivanova@example.com', 'Добро пожаловать в Numerologie PRO!', 'welcome', 'sent',
   'd0000005-de00-4000-a000-000000000005', true, NOW() - INTERVAL '5 days'),

  ('elena.ivanova@example.com', 'Подтверждение: Бесплатная консультация', 'booking_confirmation', 'bounced',
   'd0000005-de00-4000-a000-000000000005', true, NOW() - INTERVAL '2 days'),

  ('thomas.schmidt@example.com', 'Willkommen bei Numerologie PRO!', 'welcome', 'sent',
   'd0000003-de00-4000-a000-000000000003', true, NOW() - INTERVAL '7 days'),

  ('thomas.schmidt@example.com', 'Deine Bestellung wurde storniert', 'order_cancelled', 'failed',
   'd0000003-de00-4000-a000-000000000003', true, NOW() - INTERVAL '6 days');


COMMIT;
