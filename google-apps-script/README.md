# Stunden-Sync in die Auswertungs-Tabelle

Trägt die **echten Tages-Gesamtstunden** aus SimpleRoster automatisch in die
Google-Tabelle ein (Spalte „Gesamtstunden"). Quelle sind die Stempel-Einträge
(`TimeEntry`), die Admins unter **/admin/timesheets** prüfen und korrigieren.

## So läuft der Datenfluss

```
Aushilfen stempeln  ─┐
Admin korrigiert     ├─► Admin gibt Tag frei ─► /api/daily-hours ─(täglich 06:00)─► Apps Script ─► Tabelle
(/admin/timesheets) ─┘   (/admin/timesheets)    (nur freigegebene Tage)
```

**Freigabe-Gate:** Nur Tage, die der Admin unter `/admin/timesheets` per „Tag freigeben"
bestätigt hat, werden synchronisiert. Solange ein Tag nicht freigegeben ist, liefert
`/api/daily-hours` ihn nicht und das Script trägt nichts ein – so wird kein halbfertiger
Wert in die Tabelle geschrieben. Bei der Freigabe wird der Stundenwert als **Snapshot**
eingefroren; spätere Korrekturen ändern die Tabelle nur, wenn der Tag neu freigegeben wird
(und `OVERWRITE = true` gesetzt ist).

## 1. SimpleRoster: Token setzen

In Vercel (Environment Variables) **eine** der beiden Variablen setzen:

```
SHEET_SYNC_TOKEN = <langer zufälliger String>     # empfohlen, eigener Token
# – oder den bestehenden –
DASHBOARD_API_KEY = <vorhandener Wert>             # wird als Fallback akzeptiert
```

Empfohlen zusätzlich, damit Stempel-Zeiten überall als Berliner Zeit gerechnet werden:

```
TZ = Europe/Berlin
```

Endpoint testen (gibt JSON zurück):

```
https://DEINE-DOMAIN.vercel.app/api/daily-hours?date=2026-06-18&key=DEIN_TOKEN
→ { "date": "2026-06-18", "totalHours": 7.5, "entries": 2, ... }
```

## 2. Tabelle: Apps Script einrichten

1. Tabelle öffnen → **Erweiterungen → Apps Script**.
2. Inhalt von `SyncHours.gs` einfügen.
3. Oben in `CONFIG` eintragen: `API_URL` (deine Domain) und `TOKEN` (= Schritt 1).
4. Funktion `syncYesterday` einmal ausführen → Berechtigungen erlauben.
5. **Auslöser** (Uhr-Symbol links) → *Auslöser hinzufügen*:
   - Funktion: `syncYesterday`
   - Ereignis: *Zeitgesteuert* → *Tagestimer* → *06:00–07:00*

Ab dann werden jede Nacht die Stunden des Vortages eingetragen.

## Optionen (in `CONFIG`)

| Feld | Bedeutung |
|---|---|
| `SHEET_NAME` | Leer = Tab automatisch finden (Tabs mit „Bolle" werden ignoriert). Sonst exakter Tab-Name. |
| `OVERWRITE` | `false` = nur leere Zellen füllen (Handeinträge bleiben). `true` = immer überschreiben. |

## Nachträge

- Einzelnen Tag: `syncSpecificDate` (Datum im Code anpassen) ausführen.
- Zeitraum: `syncRange` (`from`/`to` anpassen) ausführen.
