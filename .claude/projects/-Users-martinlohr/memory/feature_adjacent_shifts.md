---
name: feature-adjacent-shifts
description: Nachbar-Schicht-Indikatoren im Wochenplaner als visuelle Brücke zwischen Wochen
metadata:
  type: project
---

# Nachbar-Schicht-Indikatoren (Adjacent Shifts)

**Status:** ✅ Live in Production

## Was es tut
Zeigt visuell an, ob eine MA am **Sonntag der Vorgängerwoche** oder **Montag der nächsten Woche** geplant ist. Hilft bei der Planung zusammenhängender freier Tage über Wochen hinweg.

## Visuelles Design
- **Links von Montag** (blauer 4px-Rand) = Schicht am Sonntag vorhanden
- **Rechts von Sonntag** (grüner 4px-Rand) = Schicht am Montag vorhanden
- Farbe = **Standort-Farbe** der Nachbar-Schicht (z.B. grün=Weidenallee, blau=Phoxxi)
- Wirkt wie eine optische Brücke zwischen den Wochen

## Technische Details

**Server-Side (schedule/page.tsx):**
- Query `adjacentShiftsRaw`: Schichten vom Sonntag (lastSunday) und Montag (firstMondayNextWeek)
- Select: `userId, date, locationId, location: { select: { color: true } }`
- Map `adjacentShifts`: `Record<userId, { hasSundayShift, sundayColor, hasMondayShift, mondayColor }>`
- Nutzt `berlinDay()` für Timezone-sichere Tagesberechnung

**Client-Side (WeekGrid.tsx):**
- Desktop (Zeile ~952): `days.map()` nutzt `isMonday` (di===0) und `isSunday` (di===6)
- Mobile (Zeile ~628): Gleiche Logik
- `style` Props für dynamische Farben statt Tailwind-Klassen (weil Standort-Farben runtime sind)

## Fallstricke
- Muss `berlinDay()` nutzen, nicht `.toISOString().slice()` (Timezone-Sicherheit)
- Query braucht `.location.select` für Farbe, nicht nur userId/date
- `adjacentShifts` Prop ist optional, daher `adjShifts?.sundayColor` mit Optional Chaining
- HTML `<tr>` kann keine `box-shadow` inset nutzen → Ränder auf `<td>` setzen

## Performance
- Eine einzelne Query pro Page-Load (parallel mit anderen)
- Keine zusätzliche Client-Rendering (Props durchfüttern)

## Zukünftige Ideen
- Hover-Tooltip mit Name/Zeit der Nachbar-Schicht
- Desktop-only: Icon (z.B. Pfeil) statt nur Rand
