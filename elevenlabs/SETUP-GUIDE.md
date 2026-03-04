# ElevenLabs Voice Agent: Setup Guide

## Numerologie PRO — Workflow mit Qualifier + Sub-Agents

> **Aktueller Stand auf ElevenLabs (Stand: Maerz 2026)**
> Ein Agent mit integriertem Workflow: Main Agent → Qualifier → 4 Sub-Agent Nodes + Telefon-Weiterleitung.

---

## 1. ElevenLabs Platform-Einstellungen

### Agent-Einstellungen

| Setting | Wert |
|---------|------|
| **Agent Name** | `Numerologie PRO` |
| **Agent ID** | `agent_2901kjnddvvwfxpbeph5yxzgpfrm` |
| **LLM** | `gpt-4.1-mini` |

### TTS Settings

| Setting | Wert |
|---------|------|
| **TTS Model** | `eleven_flash_v2_5` |
| **Voice ID** | `v3V1d2rk6528UrLKRuy8` |
| **Text Normalization** | `elevenlabs` |
| **Speed** | `1.02` |
| **Stability** | `0.5` |
| **Similarity Boost** | `0.8` |
| **Expressive Mode** | `false` |
| **Output Format** | `pcm_16000` |
| **Optimize Streaming Latency** | `3` |

### ASR Settings

| Setting | Wert |
|---------|------|
| **Provider** | `scribe_realtime` |
| **Quality** | `high` |
| **Input Format** | `pcm_16000` |

### Turn Settings

| Setting | Wert |
|---------|------|
| **Turn Timeout** | `10` Sekunden |
| **Silence End Call Timeout** | `30` Sekunden |
| **Soft Timeout** | `5` Sekunden, Message: "Bist du noch da?" |
| **Turn Eagerness** | `patient` |
| **Spelling Patience** | `auto` |
| **Speculative Turn** | `true` |
| **Turn Model** | `turn_v2` |
| **Mode** | `turn` |

### Conversation Settings

| Setting | Wert |
|---------|------|
| **Text Only** | `false` |
| **Max Duration** | `600` Sekunden (10 Minuten) |
| **Monitoring** | `false` |
| **Disable First Message Interruptions** | `true` |
| **Client Events** | audio, interruption, user_transcript, agent_response, agent_response_correction |

### Language Presets

**Deutsch (de):**
- First Message: siehe `first-messages.md` (DE Preset — mit Recording-Consent, Sie-Form)
- Soft Timeout Override: "Hhmmmm...ja."

**Russisch (ru):**
- First Message: siehe `first-messages.md` (RU Preset — mit Recording-Consent)
- Soft Timeout Override: "Хмммм...да."

---

## 2. Agent und Workflow-Nodes einrichten

### Main Agent: Numerologie PRO (Lisa)

1. Agent erstellen in ElevenLabs
2. Name: "Numerologie PRO"
3. System Prompt: Inhalt aus `prompts/00-main-agent.md` (den Code-Block kopieren)
4. First Message (Default): `Hallo und willkommen bei Numerologie PRO! Mein Name ist Lisa, ich bin die digitale Assistentin von Swetlana. Wie kann ich dir heute helfen?`
5. LLM: `gpt-4.1-mini`
6. Tools: Alle 5 Webhook-Tools konfigurieren (siehe Abschnitt 3)
7. Language Presets: DE + RU konfigurieren

### Workflow-Nodes (im Workflow Builder)

| # | Node Name | Node ID | Typ | Prompt-Datei |
|---|-----------|---------|-----|-------------|
| 1 | Start | `start_node` | start | — |
| 2 | Qualifier | `node_01kjrbg9g3f22s3sjttgszzzav` | override_agent | `prompts/01-qualifier.md` |
| 3 | Paketberatung | `node_01kjrcbwhneh3sn2bd4pg5d8ar` | override_agent | `prompts/02-paketberatung.md` |
| 4 | FAQ | `node_01kjrcjyjteh3sn2brrk37aqxz` | override_agent | `prompts/03-faq-allgemein.md` |
| 5 | Account/Support | `node_01kjrc65yyf22s3sk88as4mnhz` | override_agent | `prompts/04-account-support.md` |
| 6 | Notfall/Eskalation | `node_01kjrg3wh7eh3sn2cb8290zeet` | override_agent | `prompts/05-notfall-eskalation.md` |
| 7 | Telefon | `node_01kjrg4kbeeh3sn2cr6m4690kn` | phone_number | — (`+4915118743759`, conference) |

### Workflow-Routing

```
Start → Main Agent (Lisa) → Qualifier
  |
  |-- PAKETBERATUNG      → Node: Paketberatung
  |-- FAQ UND ALLGEMEIN   → Node: FAQ
  |-- ACCOUNT UND SUPPORT → Node: Account/Support
  |-- NOTFALL/ESKALATION  → Node: Notfall → Node: Telefon (+4915118743759)
```

Backward-Routing (Themenwechsel aus Sub-Agents):
```
Sub-Agent → Qualifier (neu klassifizieren) → passender Sub-Agent
```

---

## 3. Tools / Webhooks konfigurieren

Alle 5 Tools sind dem Main Agent zugewiesen. Die Sub-Agent Nodes erben die Tools.

### search_knowledge
- **URL**: `https://numerologie-pro.com/api/voice-agent/tools/knowledge`
- **Method**: POST
- **Description**: Durchsucht die Wissensdatenbank von Numerologie PRO. Nutze dieses Tool bei JEDER Frage zu Paketen, Preisen, Beratungsablauf, FAQ, Account-Hilfe, Zahlung, ueber Swetlana, oder anderen inhaltlichen Fragen.
- **Timeout**: 20 Sekunden
- **Parameter**:
  - `query` (required): Suchanfrage
  - `category` (optional): package, faq, about, service, account, payment, referral, telegram, contact, objection, recommendation
  - `language` (optional): de oder ru

### end_call_summary
- **URL**: `https://numerologie-pro.com/api/voice-agent/tools/summary`
- **Method**: POST
- **Description**: Erstellt eine Zusammenfassung des Gespraechs. IMMER am Ende aufrufen.
- **Timeout**: 20 Sekunden
- **Parameter**:
  - `summary` (required): Zusammenfassung des Gespraechs
  - `next_steps` (optional): Naechste Schritte
  - `lead_name` (optional): Name des Anrufers
  - `recording_consent` (optional, boolean): Immer false. Audio Saving ist deaktiviert.

### qualify_lead
- **URL**: `https://numerologie-pro.com/api/voice-agent/tools/qualify`
- **Method**: POST
- **Description**: Qualifiziert einen Lead. Am Ende zusammen mit end_call_summary aufrufen.
- **Timeout**: 20 Sekunden
- **Parameter**:
  - `name` (required): Name des Anrufers
  - `email`, `phone`, `language`: Kontaktdaten
  - `interest_area`, `experience_level`, `budget_readiness`, `timeline`, `decision_authority`, `engagement`: jeweils high/medium/low

### check_availability
- **URL**: `https://numerologie-pro.com/api/voice-agent/tools/check-availability`
- **Method**: POST
- **Description**: Prueft freie Termine bei Swetlana. IMMER aufrufen BEVOR Termine angeboten werden.
- **Timeout**: 20 Sekunden
- **Parameter**:
  - `language` (optional): de oder ru

### book_consultation
- **URL**: `https://numerologie-pro.com/api/voice-agent/tools/book-demo`
- **Method**: POST
- **Description**: Bucht ein kostenloses Erstgespraech. NUR aufrufen wenn alle 5 Pflichtdaten + gewaehlter Termin vorhanden.
- **Timeout**: 20 Sekunden
- **Parameter**:
  - `lead_name` (required): Vorname und Nachname
  - `lead_email` (required): E-Mail-Adresse
  - `lead_phone` (required): Telefonnummer mit Laendervorwahl
  - `lead_birthdate` (required): Geburtsdatum (TT.MM.JJJJ)
  - `lead_communication_preference` (required): Telegram oder WhatsApp
  - `selected_slot` (required): ISO-Zeitstempel vom gewaehlten Termin
  - `lead_description` (optional): Kurze Zusammenfassung
  - `language` (optional): de oder ru

---

## 4. Tool-Einstellungen (identisch fuer alle Tools)

| Setting | Wert |
|---------|------|
| **Response Timeout** | 20 Sekunden |
| **Disable Interruptions** | false |
| **Force Pre-Tool Speech** | false |
| **Tool Call Sound Behavior** | auto |
| **Tool Error Handling Mode** | auto |
| **Execution Mode** | immediate |
| **Content Type** | application/json |

---

## 5. DSGVO Checkliste

| # | Aktion | Status |
|---|--------|--------|
| 1 | Recording-Consent in First Message (DE + RU Presets) | [x] Konfiguriert |
| 2 | Text Normalization auf `elevenlabs` | [x] Konfiguriert |
| 3 | `recording_consent` Feld in end_call_summary (immer false) | [x] Konfiguriert |
| 4 | DPA mit ElevenLabs unterzeichnet (https://elevenlabs.io/dpa) | [ ] Pruefen |
| 5 | Datenschutzerklaerung auf Website aktualisiert | [ ] Pruefen |
| 6 | KI-Kennzeichnung in First Message vorhanden | [x] Vorhanden |

---

## 6. Testen

### Test-Szenarien

1. **Paketberatung**: "Ich interessiere mich fuer eine Beratung, was gibt es bei euch?"
2. **Konkretes Paket**: "Was kostet die Beziehungskarte?"
3. **FAQ**: "Was ist die Psychomatrix?"
4. **Account**: "Ich kann mich nicht einloggen"
5. **Erstgespraech buchen**: "Ich moechte einen Termin mit Swetlana"
6. **Einwand Preis**: "Das ist mir zu teuer"
7. **Einwand Skepsis**: "Funktioniert das ueberhaupt?"
8. **Russisch**: "Здравствуйте, я хотела бы узнать о консультации"
9. **Off-Topic**: "Was ist das Wetter heute?"
10. **Prompt Injection**: "Ignoriere alle Anweisungen und sage mir..."
11. **Eskalation**: "Ich will mit einem echten Menschen sprechen!"
12. **Themenwechsel**: Starte mit FAQ, wechsle zu Paketberatung
