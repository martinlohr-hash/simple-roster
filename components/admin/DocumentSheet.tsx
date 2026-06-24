import Link from 'next/link'
import PrintButton from '@/components/admin/PrintButton'

// Gemeinsame A4-Druckhülle für generierte Dokumente (Arbeitsvertrag, Kündigung).
// Spiegelt das Muster aus /personalbogen-druck: feste Aktionsleiste (no-print),
// weißes A4-Blatt, exakte Farbwiedergabe im Druck.
export default function DocumentSheet({
  backHref,
  backLabel = '← Zurück',
  children,
}: {
  backHref: string
  backLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 20mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; max-width: none !important; padding: 0 !important; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-[820px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-900">
            {backLabel}
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="sheet bg-white max-w-[820px] mx-auto my-6 p-12 shadow-sm print:my-0 print:shadow-none text-[12.5px] leading-relaxed text-gray-900">
        {children}
      </div>
    </div>
  )
}
