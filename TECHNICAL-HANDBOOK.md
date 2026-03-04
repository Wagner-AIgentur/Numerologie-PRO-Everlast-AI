# Numerologie PRO — Technisches Handbuch

> Vollstaendige technische Dokumentation aller Systeme, Features und Architekturentscheidungen.
> Dieses Handbuch erklaert jede Funktion, jeden Datenfluss und jede Datei im Projekt.

**Projekt:** Numerologie PRO — Full-Stack AI Numerology Platform
**Live:** [numerologie-pro.com](https://numerologie-pro.com)
**Entwickler:** Danil Wagner, Wagner AIgentur
**Tech Stack:** Next.js 14, TypeScript, Supabase, ElevenLabs, Stripe, n8n

---

## Inhaltsverzeichnis

1. [Systemarchitektur](#1-systemarchitektur)
2. [Voice Agent System](#2-voice-agent-system-lisa)
3. [Authentifizierung & Sicherheit](#3-authentifizierung--sicherheit)
4. [Zahlungssystem (Stripe)](#4-zahlungssystem-stripe)
5. [PDF-Generierung](#5-pdf-generierung)
6. [Email-System](#6-email-system)
7. [Automatisierungs-Engine](#7-automatisierungs-engine)
8. [CRM Dashboard](#8-crm-dashboard)
9. [Telegram Bot](#9-telegram-bot)
10. [n8n Workflows](#10-n8n-workflows)
11. [Internationalisierung](#11-internationalisierung-de--ru)
12. [Datenbank-Schema](#12-datenbank-schema)
13. [API-Referenz (alle Endpoints)](#13-api-referenz-alle-endpoints)
14. [Frontend-Seiten](#14-frontend-seiten)
15. [Components](#15-components)
16. [Library-Module](#16-library-module)
17. [Konfigurationsdateien](#17-konfigurationsdateien)
18. [Cron Jobs](#18-cron-jobs)
19. [DSGVO & EU AI Act Compliance](#19-dsgvo--eu-ai-act-compliance)
20. [Deployment & Infrastruktur](#20-deployment--infrastruktur)
21. [Dateiverzeichnis](#21-dateiverzeichnis)

---

## 1. Systemarchitektur

### Ueberblick

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  Next.js 14 (App Router) + Tailwind CSS + Shadcn/UI                     │
│                                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Landing Page │  │ Voice Agent  │  │  Dashboard   │  │ Admin CRM    │  │
│  │ + E-Commerce│  │ Widget (WS)  │  │ (Kunde)      │  │ (60+ Routes) │  │
│  └─────────────┘  └──────┬───────┘  └──────────────┘  └──────────────┘  │
└────────────┬─────────────┼──────────────────┬────────────────────────────┘
             │             │                  │
┌────────────▼─────────────▼──────────────────▼────────────────────────────┐
│                        API LAYER (Next.js)                                │
│                                                                          │
│  Voice Agent (10)        Admin API (50+)          Webhooks (4)           │
│  /api/voice-agent/       /api/admin/              /api/stripe/webhook    │
│    signed-url              customers, orders       /api/telegram/webhook │
│    webhook                 analytics, content      /api/n8n/webhook      │
│    tools/* (5 Tools)       automations, bots       /api/cal/webhook      │
│                            sequences, deals                              │
│                                                                          │
│  PDF Generatoren (4)     Cron Jobs (9)            Auth (3)              │
│  /api/karmic/*           /api/cron/*              /api/auth/*           │
└────────────┬───────────────────────────┬─────────────────────────────────┘
             │                           │
┌────────────▼───────────────────────────▼─────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                                │
│                                                                          │
│  20+ Tabellen    44 Migrations    RLS auf allen Tabellen                │
│  RBAC (team_roles)    Full-Text Search (tsvector + GIN)                 │
│  RPC Functions    Supabase Auth    Supabase Storage                      │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        EXTERNE SERVICES                                   │
│                                                                          │
│  ElevenLabs   → Voice Agent (WebSocket, GPT-4.1 mini, TTS Flash v2.5)  │
│  OpenRouter   → Content Studio (Claude 4.6 Sonnet, Gemini, various)   │
│  Stripe       → Checkout, Webhooks, Coupons, Promotion Codes            │
│  Cal.com      → Terminbuchung (REST API + Embed Widget)                 │
│  Resend       → 19 Email-Templates (Transaktional + Marketing)          │
│  n8n          → 6 Workflows (Self-hosted)                               │
│  Telegram API → Bot + Admin-Notifications                               │
│  Vercel       → Hosting, Edge Functions, Cron Jobs                      │
│  Upstash Redis→ Rate Limiting (Fallback: In-Memory)                     │
│  Google GA4   → Analytics + Conversion Tracking                         │
│  Meta CAPI    → Facebook/Instagram Conversion API                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Datenfluss-Diagramme

**Voice Agent Call → Lead → Buchung:**
```
Anrufer
  → WebWidget (Signed URL, kein Agent ID im Frontend)
    → ElevenLabs WebSocket
      → Lisa (Main Agent, klassifiziert Anliegen)
        → Paketberatung / FAQ / Account Support (Sub-Agents)
          → Tools: RAG-Suche, Lead-Scoring, Verfuegbarkeit, Buchung
            → Cal.com API (Termin)
            → voice_leads (Score, Grade)
            → voice_call_analyses (17-Felder-Zusammenfassung)
  → Post-Call Webhook (/api/voice-agent/webhook)
    → voice_calls (Transkript, Dauer, Sprache) [direkt Supabase]
    → voice_call_analyses (17 Felder) [direkt Supabase]
    → voice_call_events (Greeting, Qualification, Booking, Drop-off)
    → n8n (fire-and-forget) → Google Sheets + Telegram Alert
```

**Stripe Checkout → Bestellung → PDF → Zustellung:**
```
Frontend /checkout?packageKey=pdf_analyse&birthdate=15.03.1990
  → POST /api/stripe/create-checkout
    → Stripe Checkout Session (mit Metadata)
      → Kunde zahlt
        → Stripe Webhook: checkout.session.completed
          → POST /api/stripe/webhook
            1. Order-Record erstellen
            2. Profil auto-erstellen (Guest Checkout)
            3. Bestellbestaetigung per Email
            4. PDF generieren (Puppeteer + Chromium)
            5. Upload → Supabase Storage
            6. PDF per Email + Telegram/WhatsApp senden
            7. Affiliate-Provision berechnen
            8. Email-Sequenz starten
            9. Automations triggern
           10. Meta CAPI Conversion tracken
```

---

## 2. Voice Agent System ("Lisa")

### Architektur

Lisa ist ein Workflow-basiertes System auf ElevenLabs Conversational AI. Ein Agent (`Numerologie PRO`, LLM: `gpt-4.1-mini`, TTS: `eleven_flash_v2_5`) mit integriertem Workflow: Main Agent → Qualifier → 4 Sub-Agent Nodes + Telefon-Weiterleitung.

```
Anrufer → ElevenLabs WebSocket (Signed URL)
                    │
               Lisa (Main Agent)
               Begruesst Anrufer
                    │
               Qualifier (Node)
               Klassifiziert Anliegen (bilingual DE+RU)
                    │
    ┌──────┬────────┼────────┬────────────┐
    ▼      ▼        ▼        ▼            ▼
Paket-   FAQ     Account/  Notfall/    Telefon
berat.   Agent   Support   Eskalation  +4915118743759
(Verkauf)(Allg.) (Tech.)   (Beruhigt)  (conference)
    │
    ▼
Cal.com Booking
Lead Scoring
```

### Endpoints

| Endpoint | Methode | Datei | Funktion |
|----------|---------|-------|----------|
| `/api/voice-agent/signed-url` | GET | `app/api/voice-agent/signed-url/route.ts` | Generiert temporaeren WebSocket-Token. Die Agent ID bleibt serverseitig (Sicherheit). |
| `/api/voice-agent/config` | GET/PUT | `app/api/voice-agent/config/route.ts` | Liest/schreibt `conversation.yaml`. PUT erstellt automatisch ein Backup. |
| `/api/voice-agent/sync` | POST | `app/api/voice-agent/sync/route.ts` | Synchronisiert `conversation.yaml` → ElevenLabs API. Baut Agent-Config, Prompts, Tools, Spracheinstellungen. |
| `/api/voice-agent/webhook` | POST | `app/api/voice-agent/webhook/route.ts` | ElevenLabs Post-Call Webhook. Empfaengt Transkript, erkennt Sprache, trackt Events, prueft DSGVO-Consent. |
| `/api/voice-agent/stats` | GET | `app/api/voice-agent/stats/route.ts` | KPI-Dashboard: Call Count, Conversion Rate, Lead Grades, Analyse-Aggregationen. |

### Server Tools (5 Webhook-Endpoints)

ElevenLabs ruft diese Endpoints waehrend des Gespraechs auf:

| Tool | Endpoint | Datei | Funktion |
|------|----------|-------|----------|
| `search_knowledge` | `/api/voice-agent/tools/knowledge` | `app/api/voice-agent/tools/knowledge/route.ts` | RAG-Suche in 42 Wissenseintraegen. Nutzt PostgreSQL Full-Text Search (`tsvector` + GIN Index) mit deutschem Stemming. Fallback: `ilike`-Matching. Antwortzeit <10ms. |
| `qualify_lead` | `/api/voice-agent/tools/qualify` | `app/api/voice-agent/tools/qualify/route.ts` | 6-Kriterien Lead-Scoring (0-100). Speichert Score, Grade (A/B/C) und Qualifikationsdetails in `voice_leads`. |
| `check_availability` | `/api/voice-agent/tools/check-availability` | `app/api/voice-agent/tools/check-availability/route.ts` | Fragt Cal.com API nach verfuegbaren Terminen (naechste 7 Tage). Verteilt 2-3 Slots ueber verschiedene Tage fuer natuerliche Auswahl. |
| `book_consultation` | `/api/voice-agent/tools/book-demo` | `app/api/voice-agent/tools/book-demo/route.ts` | Bucht Termin bei Cal.com (inkl. automatischem Retry bei fehlerhafter Telefonnummer). Erstellt `voice_appointments`-Record. Aktualisiert Lead-Status auf `demo_booked`. |
| `end_call_summary` | `/api/voice-agent/tools/summary` | `app/api/voice-agent/tools/summary/route.ts` | KI-generierte Gespraechszusammenfassung mit 17 Feldern. Speichert direkt in `voice_call_analyses` (Supabase). Forward an n8n (fire-and-forget) fuer Google Sheets Logging. |

### Lead-Scoring-Algorithmus

Datei: `lib/voice-scoring/lead-scorer.ts`

```
Kriterium               Gewicht   Bewertung
─────────────────────────────────────────────────
Interessengebiet          25%     hoch=100, mittel=60, niedrig=20
Budget-Bereitschaft       25%     bereit=100, nachdenken=50, kein_budget=10
Zeitrahmen                20%     sofort=100, wochen=60, monate=30, unklar=10
Erfahrungslevel           15%     kennt_numerologie=100, interessiert=60, skeptisch=20
Entscheidungsbefugnis     10%     selbst=100, mit_partner=50, fuer_andere=30
Engagement                 5%     viele_fragen=100, hoert_zu=50, einsilbig=20

Score = Summe(Punkte × Gewicht)

Grade A: Score >= 70  → "Hot Lead" — Sofortige Terminbuchung empfehlen
Grade B: Score >= 40  → "Warm Lead" — Kostenlose Beratung anbieten
Grade C: Score <  40  → "Cold Lead" — Website/Rechner empfehlen
```

### RAG-Wissensdatenbank

Datei: `app/api/voice-agent/tools/knowledge/route.ts`

- **42 Wissenseintraege** in `voice_knowledge` Tabelle
- **Kategorien:** package, faq, about, service, account, payment, referral, telegram, contact, objection, recommendation
- **Primaer:** PostgreSQL Full-Text Search mit `to_tsvector('german', content)`
- **GIN Index** fuer performante Suche (<10ms)
- **Fallback:** `ilike`-Matching auf Titel und Inhalt
- **Zweisprachig:** Separate `title_de`/`content_de` und `title_ru`/`content_ru` Felder
- **Keyword-Array:** Exakte Treffer fuer Fachbegriffe (z.B. "Psychomatrix", "Karmaknoten")

### Konfiguration

- **conversation.yaml** (590 Zeilen, `config/conversation.yaml`): Single Source of Truth fuer Persona, Regeln, Pakete, Einwandbehandlung, Qualifizierungskriterien, Farewell-Messages
- **Agent Prompts** (679 Zeilen, `elevenlabs/prompts/`): System Prompts fuer Main Agent + 3 Sub-Agents
- **Config Builder** (`lib/elevenlabs/config-builder.ts`): Baut ElevenLabs Agent-Config aus YAML, verteilt Tools auf Sub-Agents

### Post-Call Analyse (Webhook)

Datei: `app/api/voice-agent/webhook/route.ts`

Nach jedem Gespraech sendet ElevenLabs einen `post_call_transcription` Webhook mit Transkript, Metadaten und `data_collection_results` (17 Analyse-Felder).

**Wichtig:** Der Vercel-Webhook speichert DIREKT in Supabase — n8n ist NICHT am Datenbankfluss beteiligt.

1. **Authentifizierung:** Dual-Auth — HMAC-Signatur (`elevenlabs-signature` Header, SHA-256) oder Legacy-Secret (`x-webhook-secret`)
2. **Spracherkennung:** Prueft ob Transkript kyrillische Zeichen enthaelt → `de` oder `ru`
3. **DSGVO-Consent:** Analysiert erste 4 User-Nachrichten auf Ablehnungs-Keywords
4. **Call Record:** Speichert Transkript, Dauer, Sprache, Channel direkt in `voice_calls` (Supabase Upsert)
5. **Event-Tracking:** Erkennt Keywords in Nachrichten und erstellt Events in `voice_call_events`:
   - `greeting` → Begruessungsphase
   - `qualification` → Qualifizierungsfragen
   - `objection` → Einwaende
   - `booking_attempt` → Buchungsversuch
   - `drop_off` → Gespraechsabbruch
6. **Analyse-Extraktion:** Extrahiert 17 Felder aus `data_collection_results` → speichert direkt in `voice_call_analyses` (Supabase Insert)
7. **n8n Forward (fire-and-forget):** Sendet flache Analyse-Daten per HTTP POST an n8n Webhook — nur fuer Google Sheets Logging + Telegram Hot-Lead Alert. Kein Warten auf Antwort.

**Datenfluss-Architektur (NEU):**
```
ElevenLabs post_call_transcription
  → POST /api/voice-agent/webhook (Vercel)
    → Supabase: voice_calls (Upsert)
    → Supabase: voice_call_events (Insert)
    → Supabase: voice_call_analyses (Insert)
    → n8n Webhook (fire-and-forget, non-blocking)
        → Google Sheets (17 Felder)
        → Telegram Hot-Lead Alert (wenn kaufbereitschaft=hoch)
```

**Fruehere Architektur (ersetzt):** ElevenLabs → n8n → Google Sheets + n8n → Vercel → Supabase. Dieses Relay ueber n8n als Middleman war unzuverlaessig (Timeouts, Datenverlust). Die neue Architektur speichert zuverlaessig in Supabase und nutzt n8n nur noch fuer externes Reporting.

### DSGVO-Implementierung im Voice Agent

- **Plan A:** Audio Saving deaktiviert → kein Recording Consent noetig
- **KI-Kennzeichnung:** Pflicht im Greeting (EU AI Act Art. 50 Abs. 4)
- **Consent-Pruefung:** Analysiert erste Nachrichten auf Ablehnung
- **Recording Redaction:** Ohne Consent werden `recording_url` und `transcript` auf NULL gesetzt
- **Data Retention:** 90 Tage (ElevenLabs Advanced Setting)
- **Human Handover:** `transfer_to_number` Tool fuer Weiterleitung an echte Person

---

## 3. Authentifizierung & Sicherheit

### Auth-Flow

Datei: `middleware.ts`

```
Request eingehend
  → Supabase Session auffrischen (JWT Token aus Cookies)
  → Route-Pruefung (nach Locale-Prefix-Entfernung):
    - /dashboard/* oder /admin/* → User erforderlich, sonst Redirect zu /login
    - Alles andere → oeffentlich
  → next-intl Middleware (i18n Routing)
  → Supabase Auth Cookies setzen
```

### Supabase Clients (3 Typen)

| Client | Datei | Runtime | RLS | Verwendung |
|--------|-------|---------|-----|------------|
| `createBrowserClient` | `lib/supabase/client.ts` | Browser | Ja | Frontend-Queries, Realtime |
| `createServerClient` | `lib/supabase/server.ts` | Server Component | Ja | SSR-Queries mit User-Context |
| `adminClient` | `lib/supabase/admin.ts` | API Route / Webhook | Nein (Service Role) | Admin-Operationen, Webhooks |

### Admin Guard System

Datei: `lib/auth/admin-guard.ts`

```
requireAdmin()
  1. User aus Cookies authentifizieren
  2. Profil laden → crm_status muss 'admin' sein
  3. Return User oder null

requirePermission(permission)
  1. crm_status == 'admin' pruefen
  2. Wenn keine team_role_id → Backward-Compat: voller Zugriff
  3. team_roles.permissions Array laden
  4. Zugriff wenn: '*' (Owner Wildcard) ODER spezifische Permission
  5. Return User oder null

isDemoReviewer()
  1. Prueft ob team_roles.name == 'demo_reviewer'
  2. Wird in Server Components und API Routes verwendet
  3. Filtert Kundendaten aus (leere Listen statt echte Daten)
```

### Permission-System (RBAC)

30 Permissions in 15 Kategorien:

| Kategorie | Permissions |
|-----------|------------|
| Dashboard | `dashboard.view` |
| Analytics | `analytics.view` |
| Sessions | `sessions.view`, `sessions.edit` |
| Calendar | `calendar.view` |
| Customers | `customers.view`, `customers.edit` |
| Content | `content.view`, `content.edit` |
| AI | `ai.use` |
| Telegram | `telegram.send` |
| Affiliates | `affiliates.manage` |
| Deals | `deals.view`, `deals.edit` |
| Tags | `tags.manage` |
| Team | `team.manage` |
| Automations | `automations.view`, `automations.edit` |
| Bot | `bot.manage` |
| Coupons | `coupons.manage` |
| Tasks | `tasks.view`, `tasks.edit` |
| Sequences | `sequences.view`, `sequences.edit` |
| Fields | `fields.manage` |
| Leads | `leads.manage` |
| Instagram | `instagram.view`, `instagram.edit` |
| Inbox | `inbox.view`, `inbox.edit` |

### Rollen

| Rolle | Permissions | Beschreibung |
|-------|------------|--------------|
| `owner` | `*` (Wildcard) | Voller Zugriff auf alles |
| `manager` | Alle ausser `team.manage` | Kann alles ausser Team-Rollen verwalten |
| `assistant` | View + Edit (kein Manage) | Kann Daten sehen und bearbeiten |
| `viewer` | Nur View-Permissions | Kann nur lesen |
| `demo_reviewer` | Alle 30 Permissions | Voller Feature-Zugriff, aber Kundendaten gefiltert (RLS + API-Level) |

### Demo-Reviewer Isolation (3 Schichten)

| Schicht | Mechanismus | Was geschuetzt wird |
|---------|-------------|---------------------|
| **DB-Level (RLS)** | Restrictive Policies: `NOT is_demo_reviewer() OR is_demo = true` | `voice_calls`, `voice_leads`, `voice_call_analyses` — nur Demo-Daten sichtbar |
| **API-Level** | `isDemoReviewer()` Check → leere Responses | Customers, Inbox, Instagram Conversations |
| **Page-Level** | `isDemoReviewer()` Check → leere Listen oder Redirect | Kundenliste, Pipeline, Kundendetail |

### Rate Limiting

Datei: `lib/rate-limit.ts`

- **Default:** 10 Requests / 60 Sekunden pro IP
- **Strict:** 3 Requests / 60 Sekunden (Checkout, kritische Endpoints)
- **Backend:** Upstash Redis (Produktion) mit In-Memory Fallback (Entwicklung)
- **Keys:** `checkout:${ip}`, `admin:${ip}`, `karmic:${ip}`

---

## 4. Zahlungssystem (Stripe)

### Checkout-Flow

Datei: `app/api/stripe/create-checkout/route.ts`

```
POST /api/stripe/create-checkout
Body: { packageKey, locale, birthdate, couponCode, referralCode }

1. Rate Limit pruefen (Strict: 3/60s)
2. User authentifizieren (Supabase)
3. Coupon validieren:
   - Aktiv? Nicht abgelaufen? Nicht max. verwendet?
   - Stripe Promotion Code ID vorhanden?
4. Line Items bauen:
   - Produkt hat stripe_price_id → verwenden
   - Sonst → inline price_data erstellen
5. Referral Code aufloesen (Body > Cookie > leer)
6. Stripe Checkout Session erstellen:
   - mode: 'payment'
   - metadata: package_key, profile_id, birthdate, coupon_code, referral_code, locale
   - success_url (unterschiedlich fuer PDF, Beratung, Digitale Produkte)
7. Return { url: session.url }
```

### Webhook-Verarbeitung

Datei: `app/api/stripe/webhook/route.ts`

Events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

**checkout.session.completed:**
1. Metadata extrahieren (package_key, profile_id, locale, birthdate)
2. Profil finden oder auto-erstellen (Guest Checkout)
3. Idempotenz-Check (Order existiert bereits?)
4. Order-Record erstellen
5. Activity Feed aktualisieren
6. Bestellbestaetigung per Email senden
7. Bei Beratung: Session-Record erstellen
8. Lead als `converted` markieren
9. Coupon-Nutzung tracken + Affiliate-Provision berechnen
10. Bei PDF: Generieren → Storage Upload → Email + Telegram/WhatsApp
11. Email-Sequenz starten
12. Automations triggern (`order_completed`)
13. Meta CAPI Conversion tracken

**checkout.session.expired:**
1. Pruefen ob Kunde bereits bezahlt hat (Skip)
2. Retry-URL bauen
3. Abandoned Cart Recovery Email senden
4. Activity Feed loggen

### Coupon-System

```
coupons Tabelle:
  code           — Eindeutiger Coupon-Code
  type           — 'percent' oder 'fixed'
  value          — Rabattwert (Prozent oder Cent)
  max_uses       — Maximale Verwendungen
  used_count     — Aktuelle Verwendungen (atomar inkrementiert)
  applies_to     — 'all' oder spezifische Pakete
  valid_from     — Gueltigkeitsbeginn
  valid_until    — Ablaufdatum
  stripe_coupon_id              — Stripe Coupon ID
  stripe_promotion_code_id      — Stripe Promotion Code ID
  affiliate_id   — Verknuepfung mit Affiliate
  purpose        — 'referral' oder 'marketing'
```

### Affiliate-System

- Jeder Affiliate hat einen eindeutigen Referral-Code
- 15% Rabatt-Coupons werden automatisch generiert
- `record_affiliate_conversion()` RPC inkrementiert Totals atomar
- Provisionen werden in `affiliate_conversions` getrackt
- Affiliates-Dashboard zeigt: Conversions, Revenue, Commission

---

## 5. PDF-Generierung

### Technologie

- **Renderer:** Puppeteer + `@sparticuz/chromium` (serverless-kompatibel)
- **Runtime:** Node.js (nicht Edge — Puppeteer benoetigt Chromium Binary)
- **Speicher:** 1024 MB RAM, 60s Timeout (Vercel Function Config)
- **Turbopack Fix:** `outputFileTracingIncludes` in `next.config.mjs` — Chromium Brotli-Dateien muessen explizit inkludiert werden

### 4 PDF-Typen

| Produkt | Endpoint | Generator | Beschreibung |
|---------|----------|-----------|-------------|
| **Geburtstagscode** | `POST /api/karmic/birthday-code` | `lib/numerology/karmic/birthday-code-generator.ts` | Karmische Analyse basierend auf Geburtsdatum |
| **Selbstrealisierung** | `POST /api/karmic/selfrealization` | `lib/numerology/karmic/selfrealization-generator.ts` | Lebensbestimmung und Lebenszweck |
| **Karmische Knoten** | `POST /api/karmic/karmic-knots` | `lib/numerology/karmic/karmic-knots-generator.ts` | Lebenslektionen und karmische Muster |
| **Jahresvorhersage** | `POST /api/karmic/year-forecast` | `lib/numerology/karmic/year-forecast-generator.ts` | Jahreszyklus-Prognose |

### Flow

```
POST /api/karmic/birthday-code { birthdate: "15.03.1990", locale: "de" }
  → Geburtsdatum parsen (DD.MM.YYYY)
  → Numerologische Matrix berechnen (lib/numerology/karmic/calculate.ts)
  → HTML-Template rendern mit Ergebnissen
  → Puppeteer: HTML → PDF (lib/numerology/karmic/pdf-shared.ts)
  → Base64-kodiertes Logo einfuegen (lib/numerology/karmic/logo-base64.ts)
  → PDF Buffer zurueckgeben
  → Upload zu Supabase Storage (deliverables Bucket)
  → Deliverables Record erstellen
  → PDF per Email senden (Resend mit Attachment)
```

### Vercel-Konfiguration

```json
// vercel.json
{
  "functions": {
    "app/api/karmic/*/route.ts": { "maxDuration": 60, "memory": 1024 },
    "app/api/stripe/webhook/route.ts": { "maxDuration": 60, "memory": 1024 }
  }
}

// next.config.mjs
outputFileTracingIncludes: {
  '/app/api/karmic/*/route': ['./node_modules/@sparticuz/chromium/bin/**/*']
}
```

---

## 6. Email-System

### Infrastruktur

Datei: `lib/email/send.ts`

- **Provider:** Resend API
- **19 Templates** in `lib/email/templates/`
- **Logging:** Jede Email wird in `email_log` Tabelle gespeichert
- **Unsubscribe:** RFC 8058 List-Unsubscribe Header fuer Marketing-Emails
- **Bilingual:** Templates erkennen `locale` und laden DE oder RU Inhalte

### Email-Templates

| Template | Trigger | Inhalt |
|----------|---------|--------|
| `auth-confirmation` | Registrierung | Email-Bestaetigung mit Link |
| `auth-password-reset` | Passwort vergessen | Reset-Link |
| `order-confirmation` | Bestellung abgeschlossen | Bestelldetails, naechste Schritte |
| `pdf-delivery` | PDF generiert | PDF als Attachment |
| `booking-confirmation` | Termin gebucht | Termin-Details, Cal.com Link |
| `lead-welcome` | Neuer Lead (Voice Agent) | Willkommen + naechste Schritte |
| `lead-confirmation` | Lead verifiziert | Bestaetigung |
| `lead-analysis-results` | Call-Analyse fertig | Analyse-Ergebnisse |
| `abandoned-cart` | Checkout abgebrochen (30 Min) | Retry-Link + Rabatt |
| `session-reminder` | 24h vor Termin | Erinnerung mit Details |
| `upsell-consultation` | Nach PDF-Kauf | Beratungs-Empfehlung |
| `contact-confirmation` | Kontaktformular | Eingangsbestaetigung |
| `referral-welcome` | Affiliate-Link geklickt | Willkommen + Rabatt-Info |
| `admin-new-contact` | Neuer Kontakt | Admin-Benachrichtigung |
| `broadcast` | Manuell / Automatisierung | Marketing-Broadcast |
| `base` | — | HTML-Layout-Template (Header, Footer) |

---

## 7. Automatisierungs-Engine

### Architektur (Event-Condition-Action)

Datei: `lib/automation/engine.ts`

```
Event (z.B. order_completed)
  → Aktive Automation Rules laden
    → Fuer jede Rule:
      → Profil laden
      → Conditions pruefen (AND-Logik)
      → Wenn bestanden:
        → Actions der Reihe nach ausfuehren
        → Execution loggen
        → Rule-Zaehler aktualisieren
```

### Trigger-Events (17 Typen)

| Event | Wann ausgeloest |
|-------|-----------------|
| `lead_created` | Neuer Lead angelegt |
| `lead_verified` | Lead-Email bestaetigt |
| `profile_updated` | Profil aktualisiert |
| `order_completed` | Bestellung bezahlt |
| `order_refunded` | Rueckerstattung |
| `session_scheduled` | Termin gebucht |
| `session_completed` | Termin abgeschlossen |
| `tag_added` | Tag hinzugefuegt |
| `tag_removed` | Tag entfernt |
| `contact_submitted` | Kontaktformular |
| `crm_status_changed` | CRM-Status geaendert |
| `follow_up_due` | Follow-up faellig |
| `instagram_dm_received` | Instagram DM empfangen |
| `instagram_lead_received` | Instagram Lead |
| `manychat_keyword_triggered` | ManyChat Keyword |
| `manychat_subscriber_created` | ManyChat Subscriber |

### Actions (11 Typen)

| Action | Funktion |
|--------|----------|
| `add_tag` | Tag zum Profil hinzufuegen |
| `remove_tag` | Tag entfernen |
| `change_status` | CRM-Status aendern |
| `send_email` | Email senden (sprachbewusst: DE/RU) |
| `send_telegram` | Telegram-Nachricht senden |
| `create_note` | CRM-Notiz erstellen |
| `create_task` | Aufgabe erstellen |
| `enroll_sequence` | In Email-Sequenz einschreiben |
| `send_instagram_dm` | Instagram DM senden |

### Conditions

Bedingungen werden als JSON-Array gespeichert und mit AND-Logik ausgewertet:

```json
[
  { "field": "language", "operator": "eq", "value": "de" },
  { "field": "crm_status", "operator": "neq", "value": "inactive" },
  { "field": "tags", "operator": "contains", "value": "vip" }
]
```

Operatoren: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`

---

## 8. CRM Dashboard

### Seiten-Uebersicht

| Seite | URL | Datei | Funktion |
|-------|-----|-------|----------|
| Admin Home | `/admin` | `app/[locale]/admin/page.tsx` | Dashboard mit KPI-Karten |
| Voice Agent | `/admin/voice-agent` | `app/[locale]/admin/voice-agent/page.tsx` | Voice Agent KPIs |
| Voice Calls | `/admin/voice-agent/calls` | `app/[locale]/admin/voice-agent/calls/page.tsx` | Call-History mit Transkripten |
| Voice Leads | `/admin/voice-agent/leads` | `app/[locale]/admin/voice-agent/leads/page.tsx` | Lead-Management mit Scoring |
| Voice Analysen | `/admin/voice-agent/analysen` | `app/[locale]/admin/voice-agent/analysen/page.tsx` | 17-Feld Call-Analysen |
| Voice Config | `/admin/voice-agent/config` | `app/[locale]/admin/voice-agent/config/page.tsx` | YAML Config Editor |
| Kundenliste | `/admin/kunden` | `app/[locale]/admin/kunden/page.tsx` | CRM-Kontaktliste |
| Kundendetail | `/admin/kunden/[id]` | `app/[locale]/admin/kunden/[id]/page.tsx` | 360-Grad Kundenprofil |
| Pipeline | `/admin/pipeline` | `app/[locale]/admin/pipeline/page.tsx` | Kanban-Board (Lead → Client → VIP) |
| Analytics | `/admin/analytics` | `app/[locale]/admin/analytics/page.tsx` | GA4 Integration, Conversion Funnel |
| Content Studio | `/admin/content/*` | Mehrere Dateien | Competitor-Scraping, KI-Generierung, Post-Management |
| Sequences | `/admin/sequences` | `app/[locale]/admin/sequences/page.tsx` | Email-Sequenzen verwalten |
| Automations | `/admin/automations` | `app/[locale]/admin/automations/page.tsx` | Workflow-Builder |
| Broadcasts | `/admin/broadcasts` | `app/[locale]/admin/broadcasts/page.tsx` | Email-Broadcasts |
| Bot Builder | `/admin/bot` | `app/[locale]/admin/bot/page.tsx` | Telegram Bot Commands & FAQ |
| Affiliates | `/admin/affiliates` | `app/[locale]/admin/affiliates/page.tsx` | Affiliate-Programm |
| Coupons | `/admin/coupons` | `app/[locale]/admin/coupons/page.tsx` | Coupon-Verwaltung |
| Tasks | `/admin/tasks` | `app/[locale]/admin/tasks/page.tsx` | Team-Aufgaben |
| Team | `/admin/team` | `app/[locale]/admin/team/page.tsx` | Team-Rollen & Mitglieder |
| Inbox | `/admin/inbox` | `app/[locale]/admin/inbox/page.tsx` | Aktivitaetsfeed |
| Instagram | `/admin/instagram` | `app/[locale]/admin/instagram/page.tsx` | Instagram DM-Management |
| Settings | `/admin/settings` | `app/[locale]/admin/settings/page.tsx` | Kontoeinstellungen |

---

## 9. Telegram Bot

### Features

- **Tagesanalyse:** Numerologische Energie des Tages per Bot-Befehl
- **Kompatibilitaets-Check:** Zwei Geburtsdaten eingeben → Kompatibilitaet
- **PDF-Zugang:** Gekaufte PDFs ueber den Bot abrufen
- **Terminerinnerungen:** 24h vor Termin per Telegram
- **Admin-Notifications:** Neue Bestellungen, Kontakte, Voice Agent Events
- **Custom Commands:** Ueber Bot Builder im Dashboard konfigurierbar

### Endpoints

| Endpoint | Datei | Funktion |
|----------|-------|----------|
| `POST /api/telegram/webhook` | `app/api/telegram/webhook/route.ts` | Empfaengt Telegram Updates (Nachrichten, Commands) |
| `POST /api/admin/bot/settings` | `app/api/admin/bot/settings/route.ts` | Bot-Einstellungen verwalten |
| `CRUD /api/admin/bot/commands` | `app/api/admin/bot/commands/route.ts` | Custom Commands verwalten |
| `CRUD /api/admin/bot/faq` | `app/api/admin/bot/faq/route.ts` | FAQ-Eintraege verwalten |

---

## 10. n8n Workflows

6 produktionsreife Workflows in `n8n/`, jeweils als JSON-Export (direkt in n8n importierbar).
Alle Workflows sind bilingual (DE + RU) und nutzen die Numerologie PRO API als Backend.

### Uebersicht

| # | Datei | Trigger | Nodes | Ziel |
|---|-------|---------|-------|------|
| 1 | `01-tages-energie-broadcast.json` | Cron (08:00 taeglich) | 4 | Tagesenergie generieren + Telegram Broadcast |
| 2 | `02-post-purchase-upsell.json` | Stripe Webhook | 7 | Upsell 48h nach Kauf per Telegram |
| 3 | `03-abandoned-cart-recovery.json` | Stripe Webhook | 7 | Cart Recovery 1h nach Abbruch per Telegram |
| 4 | `04-geburtstags-nachricht.json` | Cron (07:00 taeglich) | 4 | Personalisierte Geburtstagsnachricht per Telegram |
| 5 | `05-voice-agent-call-report.json` | Webhook (POST) | 7 | Call-Analyse → Google Sheets + Supabase + Telegram Alert |
| 6 | `06-scheduled-content-publisher.json` | Cron (stuendlich :05) | 5 | Geplante Blog-Posts automatisch veroeffentlichen |

---

### Workflow 1: Tages-Energie Broadcast

**Datei:** `n8n/01-tages-energie-broadcast.json`
**Trigger:** Schedule — taeglich um 08:00 Uhr
**Tags:** `Numerologie PRO`, `Telegram`, `Knowledge Base`

**Ablauf:**
```
[Cron 08:00]
    │
    ▼
[GET /api/cron/daily-energy]  ←  Auth: Bearer CRON_SECRET
    │                              Generiert numerologische Tagesenergie
    │                              basierend auf aktuellem Datum
    │
    ├── Erfolg ──▶ [POST /api/telegram/broadcast]
    │                 Sendet HTML-formatierte Nachricht
    │                 an Telegram-Kanal
    │
    └── Fehler ──▶ [Telegram: Admin-Benachrichtigung]
                     Sendet Fehlermeldung an Admin-Chat
```

**Nodes:**
1. **Taeglich 08:00** — `scheduleTrigger` (Cron)
2. **Tages-Energie generieren** — `httpRequest` → GET `/api/cron/daily-energy` mit CRON_SECRET
3. **An Telegram-Kanal senden** — `httpRequest` → POST `/api/telegram/broadcast` (HTML-Text)
4. **Admin: Fehler-Benachrichtigung** — `httpRequest` → Telegram Bot API (Error Branch)

**API-Integration:**
- Input: Aktuelles Datum → Numerologie-Berechnung (Quersumme, Tagesenergie, Farbe, Affirmation)
- Output: Formatierte Nachricht an alle Telegram-Abonnenten
- Fehlerbehandlung: Separater Error-Branch mit Admin-Notification

---

### Workflow 2: Post-Purchase Upsell (48h Delay)

**Datei:** `n8n/02-post-purchase-upsell.json`
**Trigger:** Stripe Webhook — `checkout.session.completed`
**Tags:** `Numerologie PRO`, `Telegram`

**Ablauf:**
```
[Stripe Webhook: checkout.session.completed]
    │
    ▼
[Event parsen]  ←  Extrahiert: email, package_key, locale, profile_id
    │
    ├──▶ [Respond OK]  (sofortige Webhook-Response)
    │
    ▼
[2 Tage warten]  ←  n8n Wait Node (48h Delay)
    │
    ▼
[Profil + Telegram pruefen]  ←  POST /api/n8n/profile-lookup
    │                              Sucht Profil per profile_id
    │                              Prueft ob telegram_chat_id existiert
    │
    ▼
[Hat Telegram?]  ←  IF-Bedingung
    │
    ├── Ja ──▶ [Upsell per Telegram]
    │            Bilingual (DE/RU basierend auf locale)
    │            "10% Rabatt auf ergaenzendes Paket — 48h gueltig"
    │            Link zu /de/pakete oder /ru/pakete
    │
    └── Nein ──▶ (Ende — kein Telegram-Kontakt)
```

**Nodes (7):**
1. **Stripe Webhook Trigger** — Empfaengt `checkout.session.completed`
2. **Event parsen** — JavaScript: Extrahiert Metadaten aus Stripe Session
3. **Respond OK** — Sofortige 200-Response an Stripe
4. **2 Tage warten** — Wait Node (48 Stunden)
5. **Profil + Telegram pruefen** — HTTP Request → `/api/n8n/profile-lookup`
6. **Hat Telegram?** — IF: telegram_chat_id existiert?
7. **Upsell per Telegram** — Telegram Bot API: Bilingual Upsell-Nachricht

**Geschaeftslogik:**
- Wartet 48h nach Kauf, bevor Upsell gesendet wird (optimales Timing)
- Prueft ob der Kunde einen Telegram-Account verknuepft hat
- Nachricht ist sprachspezifisch (DE oder RU basierend auf Checkout-Locale)
- Enthaelt 10%-Rabatt-Anreiz mit zeitlicher Begrenzung

---

### Workflow 3: Abandoned Cart Recovery

**Datei:** `n8n/03-abandoned-cart-recovery.json`
**Trigger:** Stripe Webhook — `checkout.session.expired`
**Tags:** `Numerologie PRO`, `Telegram`, `Recovery`

**Ablauf:**
```
[Stripe Webhook: checkout.session.expired]
    │
    ▼
[Event parsen]  ←  Extrahiert: email, package_key, locale
    │
    ├──▶ [Respond OK]
    │
    ▼
[1 Stunde warten]  ←  n8n Wait Node (1h Delay)
    │
    ▼
[Profil per E-Mail finden]  ←  POST /api/n8n/profile-lookup
    │
    ▼
[Hat Telegram?]
    │
    ├── Ja ──▶ [Recovery per Telegram]
    │            "Du hast deine Buchung nicht abgeschlossen!"
    │            Bilingual DE/RU, Link zu /pakete
    │
    └── Nein ──▶ (Ende)
```

**Nodes (7):**
1. **Stripe Expired Trigger** — Empfaengt `checkout.session.expired`
2. **Event parsen** — JavaScript: Filtert nur expired Events
3. **Respond OK** — Sofortige Webhook-Response
4. **1 Stunde warten** — Wait Node (1h — nicht zu aggressiv)
5. **Profil per E-Mail finden** — Sucht User per Email
6. **Hat Telegram?** — IF-Check
7. **Recovery per Telegram** — Bilingual Reminder-Nachricht

**Geschaeftslogik:**
- Reagiert auf abgebrochene Stripe-Checkouts
- 1h Verzoegerung (Kunde kommt evtl. von selbst zurueck)
- Freundlicher Ton, kein Druck — "Dein Paket wartet auf dich"
- Nur an Kunden mit Telegram-Verknuepfung

---

### Workflow 4: Geburtstags-Nachricht

**Datei:** `n8n/04-geburtstags-nachricht.json`
**Trigger:** Schedule — taeglich um 07:00 Uhr
**Tags:** `Numerologie PRO`, `Telegram`, `Birthday`

**Ablauf:**
```
[Cron 07:00]
    │
    ▼
[Geburtstagskinder finden]  ←  POST /api/n8n/profile-lookup
    │                            Body: { birthdate_today: true }
    │                            Gibt alle Profile zurueck, deren
    │                            Geburtsdatum heute ist
    │
    ▼
[Pro Person]  ←  splitInBatches (Batch Size: 1)
    │              Iteriert ueber jeden Geburtstagskind einzeln
    │
    ▼
[Geburtstags-Nachricht senden]  ←  Telegram Bot API
    │   Bilingual:
    │   DE: "Happy Birthday, {Vorname}! Schreibe /heute..."
    │   RU: "С Днём Рождения, {Vorname}! Напиши /heute..."
    │
    └──▶ [zurueck zu: Pro Person]  (Loop bis alle verarbeitet)
```

**Nodes (4):**
1. **Taeglich 07:00** — Schedule Trigger
2. **Geburtstagskinder finden** — HTTP Request → Profile-Lookup mit `birthdate_today: true`
3. **Pro Person** — SplitInBatches (iteriert einzeln)
4. **Geburtstags-Nachricht senden** — Telegram Bot API (Loop-Back zu Node 3)

**Geschaeftslogik:**
- Sucht jeden Morgen alle User, deren Geburtsdatum (Tag+Monat) heute ist
- Sendet personalisierte Nachricht mit Vornamen
- Empfiehlt `/heute` Telegram-Command fuer persoenliche Tagesenergie
- Sprache basierend auf Profil-Sprache (DE/RU)

---

### Workflow 5: Voice Agent Call Report (17 Felder)

**Datei:** `n8n/05-voice-agent-call-report.json`
**Trigger:** Webhook (POST) — empfaengt Call-Analysen per fire-and-forget von Vercel
**Tags:** `Voice Agent`, `Numerologie PRO`

**Wichtig:** Dieser Workflow ist NUR fuer externes Reporting zustaendig (Google Sheets + Telegram). Die primaere Datenspeicherung erfolgt direkt in Supabase durch den Vercel-Webhook (`/api/voice-agent/webhook`). n8n ist NICHT am Datenbankfluss beteiligt.

**Ablauf:**
```
[Vercel fire-and-forget]  ←  HTTP POST von /api/voice-agent/webhook
    │                         oder /api/voice-agent/tools/summary
    ▼
[Daten aufbereiten (17 Felder)]  ←  JavaScript Code Node
    │   Parst BEIDE Formate:
    │   1) ElevenLabs post_call_transcription (nested data_collection_results)
    │   2) Flat JSON von /api/voice-agent/tools/summary
    │
    │   Konvertiert Booleans → "Ja"/"Nein" fuer Spreadsheet
    │   Generiert ID: VA-YYYYMMDD-HHMMSS
    │
    ├──▶ [Google Sheets: Analyse speichern]  (parallel)
    │        Append → Tabellenblatt1
    │        Alle 17 Felder als Spalten:
    │        ID, anrufer_name, anrufer_email, anrufer_telefon,
    │        sprache, kategorie, thema, anliegen,
    │        interessiertes_paket, kaufbereitschaft, einwand,
    │        geburtsdatum_genannt, status, termin_gebucht,
    │        termin_datum, follow_up_noetig, naechster_schritt,
    │        zusammenfassung
    │
    └──▶ [Webhook Response]  (parallel)
             200 OK sofort zurueck

    [Google Sheets] fertig
        │
        ▼
    [Hot Lead?]  ←  IF-Bedingung:
        │           kaufbereitschaft === "hoch" ODER
        │           status === "Termin_gebucht"
        │
        ├── Ja ──▶ [Telegram: Hot-Lead Benachrichtigung]
        │            Hot Lead Alert an Admin:
        │            Name, Kategorie, Paket, Kaufbereitschaft,
        │            Naechster Schritt, Zusammenfassung
        │
        └── Nein ──▶ (Ende — normaler Call, kein Alert)
```

**Nodes (6):**
1. **ElevenLabs Webhook** — POST Trigger (Path: `voice-agent-report`)
2. **Daten aufbereiten (17 Felder)** — JavaScript: Dual-Format-Parser
3. **Google Sheets: Analyse speichern** — Append (parallel)
4. **Webhook Response** — 200 OK (parallel)
5. **Hot Lead?** — IF: kaufbereitschaft=hoch OR status=Termin_gebucht
6. **Telegram: Hot-Lead Benachrichtigung** — Admin Alert

**17 Analyse-Felder:**

| # | Feld | Typ | Beispiel |
|---|------|-----|----------|
| 1 | `anrufer_name` | Text | "Anna Mueller" |
| 2 | `anrufer_email` | Text | "anna@example.com" |
| 3 | `anrufer_telefon` | Text | "+49 151 12345678" |
| 4 | `sprache` | Enum | "de" / "ru" |
| 5 | `kategorie` | Enum | "PAKETBERATUNG" / "FAQ" / "ACCOUNT_SUPPORT" |
| 6 | `thema` | Text | "Karriere und Beruf" |
| 7 | `anliegen` | Text | "Moechte Karriere-Analyse" |
| 8 | `interessiertes_paket` | Enum | "lebensbestimmung" / "beziehungsmatrix" / "keines" |
| 9 | `kaufbereitschaft` | Enum | "hoch" / "mittel" / "niedrig" / "unklar" |
| 10 | `einwand` | Enum | "zu_teuer" / "skeptisch" / "keine_zeit" / "keiner" |
| 11 | `geburtsdatum_genannt` | Ja/Nein | "Ja" |
| 12 | `status` | Enum | "termin_gebucht" / "interesse_geweckt" / "faq_beantwortet" |
| 13 | `termin_gebucht` | Ja/Nein | "Ja" |
| 14 | `termin_datum` | DateTime | "2025-03-10 14:00" |
| 15 | `follow_up_noetig` | Ja/Nein | "Nein" |
| 16 | `naechster_schritt` | Enum | "Keine_Aktion" / "Rueckruf_Swetlana" / "Follow_up_Email" |
| 17 | `zusammenfassung` | Text | "Interessentin fragt nach Karriere-Analyse..." |

**Dual-Format-Support:**
Der JavaScript-Parser erkennt automatisch ob die Daten von ElevenLabs (`post_call_transcription` mit verschachtelten `data_collection_results`) oder als flaches JSON vom Vercel-Webhook kommen. Beide Pfade speichern zuerst in Supabase (primaer) und forwarden dann fire-and-forget an diesen n8n-Workflow (sekundaer, nur Reporting).

---

### Workflow 6: Scheduled Content Publisher

**Datei:** `n8n/06-scheduled-content-publisher.json`
**Trigger:** Schedule — stuendlich zur Minute :05
**Tags:** `Numerologie PRO`, `Telegram`, `Content Studio`

**Ablauf:**
```
[Cron stuendlich :05]
    │
    ▼
[GET /api/cron/publish-scheduled]  ←  Auth: Bearer CRON_SECRET
    │                                   Sucht Blog-Posts mit
    │                                   scheduled_for <= NOW()
    │                                   Setzt status → "published"
    │
    ├── Erfolg ──▶ [Posts veroeffentlicht?]
    │                │
    │                ├── published_count > 0 ──▶ [Admin: Veroeffentlicht]
    │                │                            Telegram: "X Post(s) veroeffentlicht"
    │                │
    │                └── published_count = 0 ──▶ (Ende — nichts zu tun)
    │
    └── Fehler ──▶ [Admin: Fehler]
                     Telegram: "Content Publisher Fehler"
```

**Nodes (5):**
1. **Stuendlich :05** — Schedule Trigger (jede Stunde)
2. **Scheduled Posts veroeffentlichen** — GET `/api/cron/publish-scheduled`
3. **Posts veroeffentlicht?** — IF: `published_count > 0`
4. **Admin: Veroeffentlicht** — Telegram Notification (Erfolg)
5. **Admin: Fehler** — Telegram Notification (Error Branch)

**Geschaeftslogik:**
- Prueft stuendlich ob Blog-Posts mit `scheduled_for`-Datum in der Vergangenheit existieren
- Setzt deren Status auf "published" und macht sie oeffentlich sichtbar
- Admin wird per Telegram ueber jede Veroeffentlichung informiert
- Ermoeglicht Content-Planung ueber das Admin Content Studio

---

### n8n API-Endpunkte (Next.js Backend)

Die Workflows kommunizieren mit folgenden Numerologie PRO API-Routen:

| Methode | Route | Genutzt von | Beschreibung |
|---------|-------|-------------|--------------|
| GET | `/api/cron/daily-energy` | WF 1 | Generiert Tagesenergie-Text |
| POST | `/api/telegram/broadcast` | WF 1 | Sendet Nachricht an alle Telegram-Abonnenten |
| POST | `/api/n8n/profile-lookup` | WF 2, 3, 4 | Sucht Profile per email, profile_id oder birthdate_today |
| POST | `/api/voice-agent/tools/summary` | WF 5 | Speichert Call-Analyse in Supabase |
| GET | `/api/cron/publish-scheduled` | WF 6 | Veroeffentlicht geplante Blog-Posts |

Alle API-Aufrufe authentifizieren sich via `Authorization: Bearer CRON_SECRET` Header.

### Import in n8n

```bash
# Jede JSON-Datei kann direkt in n8n importiert werden:
# n8n UI → Workflows → Import from File → JSON waehlen

# Benoetigte Credentials in n8n:
# - HTTP Header Auth (CRON_SECRET fuer API-Aufrufe)
# - Google Sheets OAuth2 (fuer Workflow 5)
# - Telegram Bot Token (als Environment Variable)
# - Telegram Admin Chat ID (als Environment Variable)
```

---

## 11. Internationalisierung (DE + RU)

### Routing

- **URL-basiert:** `/de/...` und `/ru/...`
- **Middleware:** `next-intl` mit automatischer Spracherkennung
- **Default:** Deutsch (`de`)

### Abdeckung

| Bereich | DE | RU |
|---------|----|----|
| Landing Pages | ✓ | ✓ |
| Voice Agent Widget | ✓ | ✓ |
| Voice Agent Prompts | ✓ | ✓ |
| RAG-Wissensdatenbank | ✓ | ✓ |
| PDFs | ✓ | ✓ |
| Emails | ✓ | ✓ |
| Admin Dashboard | ✓ | ✓ |
| Blog Posts | 4 | 4 |
| Rechtliche Seiten | ✓ | ✓ |
| SEO Meta Tags | ✓ | ✓ |

---

## 12. Datenbank-Schema

### Tabellen-Ueberblick

```
CORE:
  profiles              — Benutzerprofile (Auth + CRM-Daten)
  orders                — Bestellungen (Stripe Session ID, Betrag, Status)
  products              — Produkte/Pakete (name_de, name_ru, Stripe Price ID)
  sessions              — Beratungstermine (Cal.com Event ID)
  deliverables          — Gelieferte PDFs (Supabase Storage URL)
  coupons               — Rabattcodes (Stripe Sync)
  coupon_usages         — Coupon-Nutzungs-Tracking
  affiliates            — Affiliate-Partner
  affiliate_conversions — Provisions-Tracking

VOICE AGENT:
  voice_calls           — Alle Anrufe (Transkript, Dauer, Sprache, is_demo)
  voice_leads           — Qualifizierte Leads (Score, Grade, Status)
  voice_call_analyses   — 17-Feld Call-Analysen (is_demo)
  voice_call_events     — Event-Tracking (Greeting, Booking, Drop-off)
  voice_appointments    — Gebuchte Termine (Cal.com Link)
  voice_knowledge       — RAG-Wissensdatenbank (42 Eintraege, tsvector)

CRM:
  contacts / contact_submissions — Kontaktformular-Einreichungen
  crm_notes             — Kundnotizen
  deals                 — CRM-Deals/Opportunities
  tasks                 — Team-Aufgaben
  activity_feed         — Aktivitaetsfeed (Inbox)
  custom_fields         — Benutzerdefinierte Felder
  custom_field_values   — Feldwerte

MARKETING:
  email_log             — Email-Versand-Log
  broadcasts            — Email-Broadcasts
  broadcast_recipients  — Empfaenger-Tracking
  sequences             — Email-Sequenzen
  email_sequence_steps  — Sequenz-Schritte
  email_sequence_enrollments — Einschreibungen
  automation_rules      — Automatisierungsregeln
  automation_logs       — Ausfuehrungs-Log
  tag_rules             — Auto-Tagging Regeln

BOT:
  telegram_commands     — Custom Bot Commands
  telegram_faq          — FAQ-Eintraege

CONTENT:
  blog_posts            — Blog-Posts
  content_calendar      — Redaktionsplan
  content_templates     — Content-Vorlagen
  content_competitors   — Wettbewerber-Tracking
  content_intel         — Competitor Intelligence
  brand_memory          — Brand-Konsistenz-Daten

SYSTEM:
  team_roles            — RBAC-Rollen (owner, manager, demo_reviewer, etc.)
  team_members          — Team-Mitglieder
```

### RLS-Policies (Row Level Security)

Alle Tabellen haben RLS aktiviert. Wichtige Policies:

- **profiles:** User sieht nur eigenes Profil (ausser Admin)
- **orders:** User sieht nur eigene Bestellungen
- **voice_calls/leads/analyses:** Restrictive Policy fuer Demo-Reviewer:
  `NOT is_demo_reviewer() OR is_demo = true`
- **voice_knowledge:** Leserechte fuer alle (oeffentliche Wissensdatenbank)

### Migrations (44 Dateien)

Alle Migrationen in `supabase/migrations/` in chronologischer Reihenfolge. Jede Migration ist atomar und kann einzeln ausgefuehrt werden.

---

## 13. API-Referenz (alle Endpoints)

### Voice Agent (10 Routes)

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/voice-agent/signed-url` | WebSocket-Token generieren |
| GET | `/api/voice-agent/config` | conversation.yaml lesen |
| PUT | `/api/voice-agent/config` | conversation.yaml aktualisieren |
| POST | `/api/voice-agent/sync` | Config → ElevenLabs synchronisieren |
| POST | `/api/voice-agent/webhook` | Post-Call Webhook |
| GET | `/api/voice-agent/stats` | KPI-Aggregationen |
| POST | `/api/voice-agent/tools/knowledge` | RAG-Suche |
| POST | `/api/voice-agent/tools/qualify` | Lead-Scoring |
| POST | `/api/voice-agent/tools/check-availability` | Cal.com Slots |
| POST | `/api/voice-agent/tools/book-demo` | Termin buchen |
| POST | `/api/voice-agent/tools/summary` | Call-Zusammenfassung |

### Auth & User (6 Routes)

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrierung |
| POST | `/api/auth/reset-password` | Passwort-Reset |
| POST | `/api/verify-email` | Email-Verifizierung |
| GET | `/api/user/export-data` | DSGVO: Datenexport |
| POST | `/api/user/request-deletion` | DSGVO: Loesch-Antrag |
| GET | `/api/email/unsubscribe` | Email-Abmeldung |

### Payment (2 Routes)

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/stripe/create-checkout` | Checkout Session erstellen |
| POST | `/api/stripe/webhook` | Stripe Webhook verarbeiten |

### PDF (6 Routes)

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/karmic/birthday-code` | Geburtstagscode PDF |
| POST | `/api/karmic/selfrealization` | Selbstrealisierung PDF |
| POST | `/api/karmic/karmic-knots` | Karmische Knoten PDF |
| POST | `/api/karmic/year-forecast` | Jahresvorhersage PDF |
| POST | `/api/calculate` | Numerologie-Berechnung |
| GET | `/api/pdf-download` | PDF herunterladen |

### Admin CRM (50+ Routes)

Alle unter `/api/admin/` — Jeder Endpoint ist mit `requirePermission()` geschuetzt.

**Kunden:** GET/PATCH/DELETE `/api/admin/customers/[id]`, GET/POST `/api/admin/customers/[id]/notes`
**Deals:** GET/POST/PATCH/DELETE `/api/admin/deals`, `/api/admin/deals/[id]`
**Tasks:** GET/POST/PATCH/DELETE `/api/admin/tasks`, `/api/admin/tasks/[id]`
**Sequences:** CRUD `/api/admin/sequences`, Steps, Enrollments
**Automations:** CRUD `/api/admin/automations`, Logs
**Broadcasts:** CRUD `/api/admin/broadcasts`, Count Audience, Send
**Content:** Posts, Calendar, Studio (Generate, Templates, Triggers), Competitors, Intel, Memory, Score
**Bot:** Commands CRUD, FAQ CRUD, Settings
**Analytics:** Dashboard Stats, Advanced Analytics, GA4, Heatmap, Visitors
**Team:** Roles CRUD, Members
**Affiliates:** CRUD
**Coupons:** CRUD
**Custom Fields:** CRUD, Values
**Tags:** Tag Rules CRUD, Run
**Instagram:** Conversations, Messages, Link, Send
**Inbox:** Feed, Stats, Mark Read
**Telegram:** Send
**AI:** Generate, Knowledge Base
**Lead Scoring:** Recalculate

### Webhooks (4 Routes)

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/stripe/webhook` | Stripe Payment Events |
| POST | `/api/telegram/webhook` | Telegram Bot Updates |
| POST | `/api/n8n/webhook` | n8n Automation Triggers |
| POST | `/api/cal/webhook` | Cal.com Booking Events |

### Cron Jobs (9 Routes)

| Endpoint | Zeitplan | Beschreibung |
|----------|----------|-------------|
| `/api/cron/session-reminders` | Taeglich 6:00 | Terminerinnerungen per Email |
| `/api/cron/sequence-processor` | Taeglich 8:00 | Email-Sequenzen verarbeiten |
| `/api/cron/auto-tagger` | Taeglich 3:00 | Kontakte automatisch taggen |
| `/api/cron/lead-scoring` | Taeglich 2:00 | Lead-Scores aktualisieren |
| `/api/cron/task-reminders` | Taeglich 7:00 | Aufgaben-Erinnerungen |
| `/api/cron/data-retention` | Taeglich 4:00 | DSGVO-Datenbereinigung |
| `/api/cron/broadcast-sender` | Taeglich 9:00 | Geplante Broadcasts senden |
| `/api/cron/purge-deleted-accounts` | Sonntags 5:00 | Geloeschte Accounts bereinigen |
| `/api/cron/competitor-scrape` | Taeglich 1:00 | Wettbewerber-Monitoring |

---

## 14. Frontend-Seiten

### Oeffentliche Seiten

| Seite | URL | Datei | Beschreibung |
|-------|-----|-------|-------------|
| Landing Page | `/` | `app/[locale]/page.tsx` | Hauptseite mit Hero, Features, Testimonials |
| Voice Agent | `/voice-agent` | `app/[locale]/voice-agent/page.tsx` | Voice Agent Landing mit WebWidget |
| Rechner | `/rechner` | `app/[locale]/rechner/page.tsx` | Kostenloser Psychomatrix-Rechner |
| Pakete | `/pakete` | `app/[locale]/pakete/page.tsx` | Produkt-Uebersicht mit Preisen |
| Blog | `/blog` | `app/[locale]/blog/page.tsx` | Blog-Listing |
| Blog Post | `/blog/[slug]` | `app/[locale]/blog/[slug]/page.tsx` | Einzelner Blog-Post |
| Kontakt | `/kontakt` | `app/[locale]/kontakt/page.tsx` | Kontaktformular |
| Checkout | `/checkout` | `app/[locale]/checkout/page.tsx` | Checkout mit Stripe |
| AGB | `/agb` | `app/[locale]/agb/page.tsx` | Allgemeine Geschaeftsbedingungen |
| Datenschutz | `/datenschutz` | `app/[locale]/datenschutz/page.tsx` | Datenschutzerklaerung |
| Impressum | `/impressum` | `app/[locale]/impressum/page.tsx` | Impressum |
| Auth | `/auth/login`, `/auth/register` | `app/[locale]/auth/*/page.tsx` | Login/Registrierung |

### Kunden-Dashboard

| Seite | URL | Datei | Beschreibung |
|-------|-----|-------|-------------|
| Dashboard | `/dashboard` | `app/[locale]/dashboard/page.tsx` | Kunden-Bestellungen und PDFs |

---

## 15. Components

### Voice Agent Components (`components/voice-agent/`)

| Component | Datei | Beschreibung |
|-----------|-------|-------------|
| VoiceAgentWidget | `VoiceAgentWidget.tsx` | ElevenLabs WebWidget Integration |
| VoiceAgentLanding | `VoiceAgentLanding.tsx` | Landing Page fuer Voice Agent |

### Admin Components (`components/admin/`)

| Component | Datei | Beschreibung |
|-----------|-------|-------------|
| AdminSidebar | `AdminSidebar.tsx` | Navigations-Sidebar |
| AdminHeader | `AdminHeader.tsx` | Top-Header mit User-Info |
| CustomerSearch | `crm/CustomerSearch.tsx` | Kunden-Suche und Filterung |
| CustomerDetailShell | `crm/CustomerDetailShell.tsx` | 360-Grad Kundenprofil-Ansicht |
| PipelineBoard | `crm/PipelineBoard.tsx` | Kanban-Board (Drag & Drop) |
| VoiceCallList | `voice/VoiceCallList.tsx` | Call-History Tabelle |
| VoiceLeadList | `voice/VoiceLeadList.tsx` | Lead-Management Tabelle |
| AnalysenList | `voice/AnalysenList.tsx` | Call-Analysen |
| ConfigEditor | `voice/ConfigEditor.tsx` | YAML Config Editor |
| SequenceEditor | `sequences/SequenceEditor.tsx` | Email-Sequenz-Builder |
| AutomationBuilder | `automations/AutomationBuilder.tsx` | Workflow-Builder UI |
| BroadcastComposer | `broadcasts/BroadcastComposer.tsx` | Broadcast-Editor |

### Calculator Components (`components/calculators/`)

| Component | Datei | Beschreibung |
|-----------|-------|-------------|
| PsychomatrixCalculator | `PsychomatrixCalculator.tsx` | Interaktiver Matrix-Rechner |
| MatrixGrid | `MatrixGrid.tsx` | 3x3 Pythagoras-Raster |
| WorkingNumbers | `WorkingNumbers.tsx` | Arbeitszahlen-Anzeige |

### Shared Components (`components/shared/`)

| Component | Datei | Beschreibung |
|-----------|-------|-------------|
| Header | `Header.tsx` | Globaler Header mit Navigation |
| Footer | `Footer.tsx` | Globaler Footer |
| LanguageSwitcher | `LanguageSwitcher.tsx` | DE/RU Sprachwechsel |
| CookieBanner | `CookieBanner.tsx` | DSGVO-konformes Cookie-Banner |

---

## 16. Library-Module

### Voice Agent (`lib/voice-scoring/`, `lib/elevenlabs/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Lead Scorer | `lib/voice-scoring/lead-scorer.ts` | 6-Kriterien Scoring-Algorithmus |
| Config Builder | `lib/elevenlabs/config-builder.ts` | YAML → ElevenLabs Agent Config |

### Numerologie (`lib/numerology/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Matrix Calculator | `lib/numerology/karmic/calculate.ts` | Pythagoras-Matrix Berechnung |
| PDF Shared | `lib/numerology/karmic/pdf-shared.ts` | Puppeteer PDF-Renderer |
| Logo Base64 | `lib/numerology/karmic/logo-base64.ts` | Eingebettete Bild-Assets |
| Birthday Code | `lib/numerology/karmic/birthday-code-generator.ts` | Geburtstagscode-Generator |
| Selfrealization | `lib/numerology/karmic/selfrealization-generator.ts` | Selbstrealisierungs-Generator |
| Karmic Knots | `lib/numerology/karmic/karmic-knots-generator.ts` | Karmische-Knoten-Generator |
| Year Forecast | `lib/numerology/karmic/year-forecast-generator.ts` | Jahresvorhersage-Generator |

### Auth & Security (`lib/auth/`, `lib/supabase/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Admin Guard | `lib/auth/admin-guard.ts` | requireAdmin, requirePermission, isDemoReviewer |
| Rate Limiter | `lib/rate-limit.ts` | Upstash Redis + In-Memory Fallback |
| Browser Client | `lib/supabase/client.ts` | Supabase Browser Client |
| Server Client | `lib/supabase/server.ts` | Supabase Server Component Client |
| Admin Client | `lib/supabase/admin.ts` | Supabase Service Role Client |
| DB Types | `lib/supabase/types.ts` | TypeScript-Typen fuer alle Tabellen |

### Email (`lib/email/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Send | `lib/email/send.ts` | Resend API Wrapper + Logging |
| Templates | `lib/email/templates/*.ts` | 19 Email-Templates |

### Automation (`lib/automation/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Engine | `lib/automation/engine.ts` | Event-Condition-Action Engine |

### AI Integration (`lib/ai/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Generate | `lib/ai/generate.ts` | OpenAI/Anthropic Content-Generierung |
| Content Studio | `lib/ai/content-studio.ts` | KI-gestuetzte Content-Erstellung |

### Validierung (`lib/validations/`)

| Modul | Datei | Beschreibung |
|-------|-------|-------------|
| Admin Schemas | `lib/validations/admin.ts` | Zod-Schemas fuer alle Admin-Endpoints |

---

## 17. Konfigurationsdateien

| Datei | Beschreibung |
|-------|-------------|
| `next.config.mjs` | Next.js Config: Turbopack, CSP Headers, Image Domains, `outputFileTracingIncludes` |
| `vercel.json` | Vercel Function Config: Memory, Timeout, Cron Schedules |
| `middleware.ts` | Auth-Pruefung, i18n Routing, Session-Refresh |
| `tailwind.config.ts` | Tailwind CSS Konfiguration, Custom Colors, Fonts |
| `tsconfig.json` | TypeScript Konfiguration |
| `eslint.config.mjs` | ESLint Regeln |
| `.env.example` | 24 Environment Variables dokumentiert |
| `config/conversation.yaml` | Voice Agent SSOT (590 Zeilen) |

---

## 18. Cron Jobs

Alle Cron Jobs laufen ueber Vercel Cron und sind in `vercel.json` konfiguriert. Jeder Endpoint ist mit `CRON_SECRET` gesichert.

| Job | Datei | Zeitplan | RAM | Timeout |
|-----|-------|----------|-----|---------|
| Session Reminders | `app/api/cron/session-reminders/route.ts` | 6:00 taeglich | 256MB | 30s |
| Sequence Processor | `app/api/cron/sequence-processor/route.ts` | 8:00 taeglich | 256MB | 60s |
| Auto-Tagger | `app/api/cron/auto-tagger/route.ts` | 3:00 taeglich | 256MB | 30s |
| Lead Scoring | `app/api/cron/lead-scoring/route.ts` | 2:00 taeglich | 256MB | 30s |
| Task Reminders | `app/api/cron/task-reminders/route.ts` | 7:00 taeglich | 256MB | 30s |
| Data Retention | `app/api/cron/data-retention/route.ts` | 4:00 taeglich | 256MB | 30s |
| Broadcast Sender | `app/api/cron/broadcast-sender/route.ts` | 9:00 taeglich | 256MB | 60s |
| Purge Deleted | `app/api/cron/purge-deleted-accounts/route.ts` | 5:00 sonntags | 256MB | 30s |
| Competitor Scrape | `app/api/cron/competitor-scrape/route.ts` | 1:00 taeglich | 512MB | 60s |

---

## 19. DSGVO & EU AI Act Compliance

### DSGVO

| Anforderung | Implementierung |
|-------------|----------------|
| **Recht auf Auskunft** | `GET /api/user/export-data` — Exportiert alle Nutzerdaten als JSON |
| **Recht auf Loeschung** | `POST /api/user/request-deletion` — 30-Tage Karenzzeit, dann Hard Delete |
| **Cookie-Consent** | `CookieBanner.tsx` — Gleichwertige Accept/Reject Buttons |
| **Email-Abmeldung** | RFC 8058 List-Unsubscribe Header, `/api/email/unsubscribe` |
| **Data Retention** | Cron Job `data-retention` — Automatische Bereinigung |
| **Impressum** | Vollstaendig nach DDG (§5) |
| **Datenschutzerklaerung** | Vollstaendig nach DSGVO Art. 13/14 |
| **RLS** | Row Level Security auf allen Tabellen |
| **CSP** | Content Security Policy Headers in `next.config.mjs` |
| **HSTS** | Strict-Transport-Security, X-Frame-Options |

### EU AI Act

| Anforderung | Implementierung |
|-------------|----------------|
| **KI-Kennzeichnung** | Voice Agent begruuesst sich als "KI-Assistentin Lisa" (Art. 50 Abs. 4) |
| **Transparenz** | Klare Offenlegung dass Gespraech KI-gestuetzt ist |
| **Human Handover** | `transfer_to_number` Tool fuer Weiterleitung an echte Person |
| **Keine Manipulation** | Keine Dark Patterns, keine psychologische Manipulation |
| **Recording Consent** | Plan A: Audio Saving OFF, kein Recording ohne Consent |

---

## 20. Deployment & Infrastruktur

### Vercel

- **Build:** `next build` (automatisch bei Git Push)
- **Runtime:** Node.js 18 (fuer Puppeteer-kompatible Routes)
- **Edge:** Alle anderen Routes
- **Cron:** 9 Scheduled Functions via `vercel.json`
- **Domains:** numerologie-pro.com, www.numerologie-pro.com

### Environment Variables (24)

Siehe `.env.example` fuer alle benoetigten Variablen:
- Supabase (URL, Anon Key, Service Role Key)
- Stripe (Secret Key, Webhook Secret, Publishable Key)
- ElevenLabs (API Key, Agent ID, Webhook Secret)
- Cal.com (API Key, Event Type ID, Webhook Secret)
- Resend (API Key)
- Telegram (Bot Token, Admin Chat ID)
- n8n (Voice Report Webhook URL)
- Meta (App Secret, Access Token, Pixel ID, IG Account ID)
- Upstash Redis (URL, Token)
- Cron Secret
- Database URL (fuer Seed Scripts)

---

## 21. Dateiverzeichnis

```
Numerologie-PRO/
├── app/
│   ├── [locale]/                    # i18n Routing (de, ru)
│   │   ├── page.tsx                 # Landing Page
│   │   ├── voice-agent/page.tsx     # Voice Agent Landing
│   │   ├── rechner/page.tsx         # Kostenloser Rechner
│   │   ├── pakete/page.tsx          # Produkte
│   │   ├── blog/                    # Blog System
│   │   ├── checkout/page.tsx        # Stripe Checkout
│   │   ├── dashboard/page.tsx       # Kunden-Dashboard
│   │   ├── kontakt/page.tsx         # Kontaktformular
│   │   ├── auth/                    # Login/Register
│   │   ├── admin/                   # CRM Dashboard (20+ Seiten)
│   │   └── agb, datenschutz, impressum/
│   └── api/
│       ├── voice-agent/             # 10 Voice Agent Routes
│       ├── admin/                   # 50+ Admin API Routes
│       ├── karmic/                  # 4 PDF Generator Routes
│       ├── stripe/                  # Checkout + Webhook
│       ├── telegram/                # Bot Webhook
│       ├── cron/                    # 9 Cron Jobs
│       ├── auth/                    # Register, Reset Password
│       └── ...
├── components/                      # 40+ React Components
│   ├── voice-agent/                 # Widget, Landing
│   ├── admin/                       # Dashboard UI
│   ├── calculators/                 # Matrix-Rechner
│   └── shared/                      # Header, Footer, etc.
├── lib/                             # 100+ Business Logic Module
│   ├── voice-scoring/               # Lead Scoring Engine
│   ├── elevenlabs/                  # Agent Config Builder
│   ├── numerology/                  # Berechnungen + PDF
│   ├── auth/                        # Admin Guard
│   ├── email/                       # 19 Templates
│   ├── automation/                  # Workflow Engine
│   ├── ai/                          # LLM Integration
│   ├── supabase/                    # DB Clients
│   └── validations/                 # Zod Schemas
├── config/
│   └── conversation.yaml            # Voice Agent SSOT (590 Zeilen)
├── elevenlabs/
│   ├── AGENT-ARCHITECTURE.md        # Multi-Agent Doku (346 Zeilen)
│   ├── SETUP-GUIDE.md               # Setup-Anleitung (197 Zeilen)
│   ├── Wissensdatenbank.md          # RAG Knowledge Base (63KB)
│   └── prompts/                     # 4 Agent-Prompts (679 Zeilen)
├── n8n/                             # 6 Workflow JSON-Exporte
├── supabase/migrations/             # 44 SQL-Migrationen
├── docs/
│   └── plans/                       # Architektur-Plaene (Telegram Bot)
├── content/blog/                    # 8 Blog Posts (DE + RU)
├── README.md                        # Projekt-Uebersicht (494 Zeilen)
├── TECHNICAL-HANDBOOK.md            # Dieses Dokument
├── sales-structure.md               # Sales Funnel Doku
├── master_plan_numerologie_pro.md   # Produkt-Roadmap
├── .env.example                     # 24 Environment Variables
├── vercel.json                      # Function Config + Cron
├── next.config.mjs                  # Next.js + Turbopack Config
├── middleware.ts                     # Auth + i18n Middleware
└── package.json                     # Dependencies
```

---

## 22. Entfernte Dateien (Datenschutz)

Die folgenden Dateien sind in der Produktionsversion vorhanden, wurden aber aus diesem
oeffentlichen Repository entfernt, da sie persoenliche oder geschaeftliche Daten enthalten.
Ihr Zweck und ihre Funktionsweise werden hier dokumentiert.

### Rechtliche Dokumente

| Entfernte Datei | Was sie enthaelt | Funktion im System |
|-----------------|------------------|---------------------|
| `Rechtliches/AVV-Vertraege/*.pdf` (9 Dateien) | Unterschriebene Auftragsverarbeitungsvertraege (DSGVO Art. 28) | DSGVO-Compliance: DPA-Vertraege mit ElevenLabs, Google Cloud, ManyChat, Stripe, Supabase, Vercel, Yandex Metrica. Werden fuer die Datenschutzerklaerung benoetigt. |

### Interne Dokumentation

| Entfernte Datei | Was sie enthaelt | Funktion im System |
|-----------------|------------------|---------------------|
| `docs/Numerologie-PRO-Admin-Handbuch-DE.pdf` | Admin-Handbuch (Deutsch) | Schritt-fuer-Schritt-Anleitung fuer alle Admin-Dashboard-Funktionen mit Screenshots |
| `docs/Numerologie-PRO-Admin-Handbuch-RU.pdf` | Admin-Handbuch (Russisch) | Russische Version des Admin-Handbuchs |
| `docs/handbuch-admin-de.html` / `ru.html` | HTML-Quellen der Handbuecher | Generiert aus Markdown, dienen als Druckvorlage fuer die PDFs |
| `docs/sales-setup-anleitung.md` | CRM-Setup-Guide | Beschreibt wie Stripe-Webhooks, Automation-Regeln und Email-Sequenzen im Admin-Panel konfiguriert werden |
| `docs/alle-nachrichten-review.md` / `.pdf` | Nachrichten-Review | Alle automatischen Kundennachrichten (Emails, Telegram) zur Freigabe durch die Inhaberin |

### Persoenliche Assets

| Entfernte Datei | Was sie enthaelt | Funktion im System |
|-----------------|------------------|---------------------|
| `public/images/swetlana-*.jpg/png` (3 Fotos) | Portrait-Fotos der Inhaberin | Werden auf der Landing Page, Ueber-Mich-Seite und in PDFs angezeigt. Im Code als `<Image src="/images/swetlana-hero.jpg" />` referenziert. |
| `public/images/certificates/cert-*.jpg` (11 Bilder) | Numerologie-Zertifikate | Angezeigt auf `/zertifikate` — Swipe-Galerie mit Lightbox. Im Code als dynamischer Import aus dem `/images/certificates/` Ordner. |
| `temp-pdf-assets/` | PDF-Cover-Bilder + Base64-Encoder | Temporaere Assets fuer die PDF-Generierung (Puppeteer). In Produktion als Base64 in `lib/numerology/karmic/logo-base64.ts` eingebettet. |
| `test-pdfs/` + `test-output.pdf` | Generierte Test-PDFs | Testausgaben der 4 Karmic-PDF-Produkte (Birthday Code, Selfrealization, Karmic Knots, Year Forecast) |

### Verification Files

| Entfernte Datei | Was sie enthaelt | Funktion im System |
|-----------------|------------------|---------------------|
| `public/google3f5eb184354ddc7c.html` | Google Search Console Verification | Bestaetigt Domain-Inhaberschaft fuer Google Search Console (SEO-Monitoring). Wird von Googlebot per HTTP GET abgerufen. |
| `public/yandex_4c7a8472f3a9ef6b.html` | Yandex Webmaster Verification | Gleiche Funktion fuer Yandex Webmaster (russische Suchmaschine). Relevant fuer RU-Traffic. |

### n8n Workflow Sanitization

| Datei | Was geaendert wurde |
|-------|---------------------|
| `n8n/05-voice-agent-call-report.json` | Google Sheets Document ID durch `YOUR_GOOGLE_SHEET_ID` Platzhalter ersetzt. Das Google Sheet hat 17 Spalten (siehe Workflow 5 Dokumentation oben) und dient als externes Reporting-Dashboard. |

### Was im Repo verbleibt (oeffentliche Daten)

Die folgenden Daten sind bewusst im Repository, da sie auf der oeffentlichen Website sichtbar und/oder gesetzlich vorgeschrieben sind:

- **Domain** (`numerologie-pro.com`) — Produktdomain, im Code als Fallback-URL
- **Kontakt-Email** (`info@numerologie-pro.com`) — Oeffentlich im Impressum
- **Telefonnummer** (`+49 1515 1668273`) — Gesetzlich vorgeschrieben im Impressum (TMG § 5)
- **Geschaeftsadresse** — Gesetzlich vorgeschrieben im Impressum
- **Cal.com Booking-URL** — Oeffentlich zugaengliche Buchungsseite
- **Voice Agent Prompts** — Gespraechslogik und Persona-Definition (kein Geheimnis)
- **Blog-Posts** — Oeffentlich auf der Website
- **Logo und Design-Assets** — Markenidentitaet

---

## Projekt-Metriken

| Metrik | Wert |
|--------|------|
| **API Endpoints** | 60+ |
| **Datenbank-Tabellen** | 20+ |
| **SQL Migrations** | 44 |
| **React Components** | 40+ |
| **Library Module** | 100+ |
| **n8n Workflows** | 6 |
| **Cron Jobs** | 9 |
| **Email Templates** | 19 |
| **Voice Agent Prompts** | 679 Zeilen |
| **YAML Config** | 590 Zeilen |
| **RAG Eintraege** | 42 |
| **Permissions** | 30 |
| **Environment Variables** | 24 |
| **Sprachen** | 2 (DE, RU) |
| **Blog Posts** | 8 (4 DE + 4 RU) |

---

*Gebaut von Danil Wagner — Wagner AIgentur*
*[wagner-aigentur.com](https://wagner-aigentur.com)*
