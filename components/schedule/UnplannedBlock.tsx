'use client'

export type UnplannedEntryData = {
  id: string
  userId: string
  locationId: string
  locationName: string
  locationColor: string
  date: string // yyyy-MM-dd (Berliner Kalendertag)
  checkinAt: string
  checkoutAt: string | null
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
}

/**
 * Gestempelter Einsatz, der zu KEINER geplanten Schicht gehört (komplett ungeplant).
 * Gestrichelte Outline macht das auf einen Blick kenntlich. Klick öffnet die Korrektur.
 */
export default function UnplannedBlock({
  entry,
  onEdit,
}: {
  entry: UnplannedEntryData
  onEdit: (entry: UnplannedEntryData) => void
}) {
  const open = !entry.checkoutAt
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onEdit(entry)}
      style={{ borderColor: entry.locationColor }}
      className="group/unpl w-full rounded-lg border-2 border-dashed bg-white text-left px-2.5 py-2 transition hover:bg-gray-50 active:scale-95"
      title="Ungeplanter Einsatz – klicken zum Korrigieren"
    >
      <div className="font-semibold text-sm leading-tight text-gray-800">
        {fmtTime(entry.checkinAt)} – {open ? 'läuft' : fmtTime(entry.checkoutAt!)}
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.locationColor }} />
        <span className="text-[10px] text-gray-500 truncate">{entry.locationName}</span>
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: entry.locationColor }}>
        ⚡ ungeplant
      </div>
    </button>
  )
}
