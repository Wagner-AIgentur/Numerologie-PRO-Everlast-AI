# Voice Agent: Komplette Workflow-Architektur

> Aktuelle Architektur auf ElevenLabs (Stand: Maerz 2026).
> Agent mit integriertem Workflow: Main Agent + Qualifier + 4 Sub-Agent Nodes + Telefon-Weiterleitung.
> Alle Prompt-Dateien, Conditions, Tools und Node IDs an einem Ort.

---

## Architektur-Uebersicht

```
                    ┌─────────────────────┐
                    │   ANRUFER (Telefon   │
                    │   oder Web-Widget)   │
                    └─────────┬───────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │    MAIN AGENT (Lisa)          │
              │    Agent: Numerologie PRO     │
              │    ID: agent_2901kjnddvvw...  │
              │    LLM: gpt-4.1-mini         │
              │    TTS: eleven_flash_v2_5    │
              │                               │
              │    Begruesst, fuehrt das      │
              │    Gespraech, klassifiziert   │
              └─────────────┬─────────────────┘
                            │
                            ▼
              ┌───────────────────────────────┐
              │    QUALIFIER (Node)           │
              │    node_01kjrbg9g3f22s3s...   │
              │    LLM: gpt-4.1-mini         │
              │    Bilingual DE + RU          │
              │                               │
              │    Analysiert und             │
              │    klassifiziert in           │
              │    4 Kategorien               │
              └──┬──────┬──────┬──────┬──────┘
                 │      │      │      │
    PAKETBERATUNG│  FAQ │  SUP.│      │ NOTFALL
                 │      │      │      │
       ┌─────────┘      │      │      └──────────┐
       ▼                ▼      ▼                  ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐
│ PAKETBERAT.│ │    FAQ     │ │  ACCOUNT/  │ │ NOTFALL/  │
│            │ │            │ │  SUPPORT   │ │ ESKALAT.  │
│ node_01kjr │ │ node_01kjr │ │ node_01kjr │ │ node_01kjr│
│ cbwhneh... │ │ cjyjteh... │ │ c65yyf2... │ │ g3wh7eh...│
│            │ │            │ │            │ │           │
│ Pakete     │ │ Psycho-    │ │ Login      │ │ Beruhigt  │
│ Preise     │ │ matrix     │ │ Zahlung    │ │ und leitet│
│ Buchung    │ │ Swetlana   │ │ Dashboard  │ │ weiter    │
│ Einwaende  │ │ Rechner    │ │ Stornierung│ │           │
└─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘
      │              │              │               │
      └──────────────┼──────────────┘               │
                     │                              ▼
           Backward: │ Themenwechsel        ┌───────────────┐
                     ▼                      │   TELEFON     │
              QUALIFIER                     │ +4915118743759│
              (neu klassifizieren)          │ (conference)  │
                                            │ node_01kjrg4k.│
                                            └───────────────┘
```

---

## Einstellungen (Agent-Level)

| Setting | Wert |
|---------|------|
| Agent Name | `Numerologie PRO` |
| Agent ID | `agent_2901kjnddvvwfxpbeph5yxzgpfrm` |
| LLM | `gpt-4.1-mini` |
| TTS Model | `eleven_flash_v2_5` |
| Voice ID | `v3V1d2rk6528UrLKRuy8` |
| Text Normalization | `elevenlabs` |
| TTS Speed | `1.02` |
| TTS Stability | `0.5` |
| TTS Similarity Boost | `0.8` |
| ASR Provider | `scribe_realtime` (high quality) |
| Default Language | `de` |
| Language Presets | DE + RU |
| Turn Timeout | 10 Sekunden |
| Silence End Call | 30 Sekunden |
| Soft Timeout | 5 Sekunden ("Bist du noch da?") |
| Turn Eagerness | `patient` |
| Max Duration | 600 Sekunden (10 Minuten) |

---

## Node-Uebersicht

| # | Node | Typ | Node ID | Datei | LLM | Aufgabe |
|---|------|-----|---------|-------|-----|---------|
| 0 | Lisa (Main) | Agent System Prompt | — | `00-main-agent.md` | gpt-4.1-mini | Begruessung + Gespraechsfuehrung |
| 1 | Qualifier | override_agent | `node_01kjrbg9g3f22s3sjttgszzzav` | `01-qualifier.md` | gpt-4.1-mini | Klassifizierung in 4 Kategorien (bilingual) |
| 2 | Paketberatung | override_agent | `node_01kjrcbwhneh3sn2bd4pg5d8ar` | `02-paketberatung.md` | inherit | Pakete, Preise, Empfehlungen, Buchung |
| 3 | FAQ/Allgemein | override_agent | `node_01kjrcjyjteh3sn2brrk37aqxz` | `03-faq-allgemein.md` | inherit | Psychomatrix, Swetlana, Rechner, FAQ |
| 4 | Account/Support | override_agent | `node_01kjrc65yyf22s3sk88as4mnhz` | `04-account-support.md` | inherit | Login, Zahlung, Dashboard, Stornierung |
| 5 | Notfall/Eskalation | override_agent | `node_01kjrg3wh7eh3sn2cb8290zeet` | `05-notfall-eskalation.md` | inherit | Beruhigt und leitet an Telefon weiter |
| 6 | Telefon | phone_number | `node_01kjrg4kbeeh3sn2cr6m4690kn` | — | — | Weiterleitung an +4915118743759 (conference) |

---

## First Messages

| Kontext | Text | Form |
|---------|------|------|
| Default (kein Preset) | Hallo und willkommen bei Numerologie PRO! Mein Name ist Lisa, ich bin die digitale Assistentin von Swetlana. Wie kann ich dir heute helfen? | Du-Form |
| DE Preset | Hallo und willkommen bei Numerologie PRO! Hier ist Lisa, Ihre KI-Assistentin. Schoen, dass Sie anrufen! Kurzer Hinweis: Dieses Gespraech kann zu Qualitaetszwecken aufgezeichnet werden. Sind Sie damit einverstanden, oder moechten Sie lieber ohne Aufzeichnung sprechen? | Sie-Form |
| RU Preset | Здравствуйте, добро пожаловать в Numerologie PRO! Меня зовут Лиза, я ваш ИИ-ассистент. Рада, что вы позвонили! Небольшое уточнение: этот разговор может быть записан в целях контроля качества. Вы согласны, или предпочитаете общаться без записи? | Вы-Form |

---

## Alle Conditions (Routing)

### Forward Conditions (Qualifier → Sub-Agent Nodes)

| # | Von | Nach | Condition | Trigger (DE + RU) |
|---|-----|------|-----------|-------------------|
| F1 | Qualifier | Paketberatung | `route_paketberatung` | Preis, Paket, buchen, Termin, Empfehlung, Beziehungskarte, Lebenskarte, Jahresprognose, Geldkanal, Bestimmung, Mein Kind, PDF-Analyse, Erstgespraech, Budget / цена, стоимость, пакет, записаться, консультация, рекомендация, бюджет |
| F2 | Qualifier | FAQ | `route_faq` | was ist, wie funktioniert, wer ist, Psychomatrix, Numerologie, Rechner, Swetlana, erklaeren, informieren, Telegram Bot / что такое, как работает, кто такая, калькулятор, нумерология, опыт, научно |
| F3 | Qualifier | Account/Support | `route_support` | Login, Passwort, Zahlung, Stornierung, Dashboard, PDF herunterladen, Fehler, funktioniert nicht, Support, Hilfe / вход, пароль, оплата, отмена, ошибка, не работает, поддержка |
| F4 | Qualifier | Notfall/Eskalation → Telefon | `route_eskalation` | Mensch, echte Person, Beschwerde, Anwalt, unzufrieden, sofort jemand, will nicht mit KI, Notfall, dringend / настоящий человек, менеджер, жалоба, адвокат, недоволен, срочно, немедленно |

### Backward Conditions (Sub-Agent Nodes → Qualifier)

| # | Von | Nach | Condition | Trigger |
|---|-----|------|-----------|---------|
| B1 | Paketberatung | Qualifier | `themenwechsel` | Anrufer wechselt das Thema |
| B2 | FAQ | Qualifier | `themenwechsel` | Anrufer wechselt das Thema |
| B3 | Account/Support | Qualifier | `themenwechsel` | Anrufer wechselt das Thema |
| B4 | Paketberatung | Qualifier | `eskalation` | Anrufer verlangt Menschen, ist veraergert |
| B5 | FAQ | Qualifier | `eskalation` | Anrufer verlangt Menschen, ist veraergert |
| B6 | Account/Support | Qualifier | `eskalation` | Anrufer verlangt Menschen, ist veraergert |

> **Eskalations-Pfad:** Sub-Agent erkennt Eskalation → Backward zum Qualifier → Qualifier erkennt NOTFALL → Forward F4 → Notfall-Node → Telefon-Weiterleitung an +4915118743759

---

## Tool-Verteilung

Alle 5 Tools sind dem Main Agent zugewiesen. Sub-Agent Nodes erben die Tools.

| Tool | Main | Qualifier | Paketberatung | FAQ | Support | Notfall |
|------|------|-----------|---------------|-----|---------|---------|
| end_call_summary | JA | — | JA | JA | JA | — |
| search_knowledge | JA | — | JA | JA | JA | — |
| check_availability | JA | — | JA | JA | — | — |
| qualify_lead | JA | — | JA | — | — | — |
| book_consultation | JA | — | JA | JA | — | — |

---

## Webhook-URLs (Base: numerologie-pro.com)

| Tool | Endpoint | Method |
|------|----------|--------|
| search_knowledge | `/api/voice-agent/tools/knowledge` | POST |
| end_call_summary | `/api/voice-agent/tools/summary` | POST |
| qualify_lead | `/api/voice-agent/tools/qualify` | POST |
| check_availability | `/api/voice-agent/tools/check-availability` | POST |
| book_consultation | `/api/voice-agent/tools/book-demo` | POST |

---

## DSGVO Hinweise

| # | Status | Detail |
|---|--------|--------|
| 1 | Recording-Consent in First Message | DE + RU Presets fragen nach Einverstaendnis |
| 2 | Text Normalization = elevenlabs | Konfiguriert |
| 3 | recording_consent Feld | Im end_call_summary Tool (immer false) |
| 4 | KI-Kennzeichnung | "KI-Assistentin" / "digitale Assistentin" / "ИИ-ассистент" |

---

## Hinweis: Workflow Edges

Stand Maerz 2026 sind die Workflow-Edges (Verbindungen zwischen Nodes) ueber den ElevenLabs Workflow Builder UI konfiguriert. Die API gibt 0 Edges zurueck — das Routing wird intern vom Workflow Builder verwaltet.
