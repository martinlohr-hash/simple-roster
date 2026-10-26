'use client'

import { useState } from 'react'

type Anrede = 'herr' | 'frau' | 'divers'

type DocCard = {
  key: string
  title: string
  desc: string
  href?: (form: 'du' | 'sie', anrede: Anrede) => string
  missing: string[]
  soon?: boolean
}

function ReadyBadge({ missing }: { missing: string[] }) {
  if (missing.length === 0) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-700">
        Daten vollständig
      </span>
    )
  }
  return (
    <span
      className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700"
      title={`Fehlt: ${missing.join(', ')}`}
    >
      {missing.length} Feld{missing.length > 1 ? 'er' : ''} fehlt
    </span>
  )
}

export default function DocumentGenerator({
  userId,
  gender,
  contractMissing,
  probezeitMissing,
  regulaerMissing,
}: {
  userId: string
  gender?: string | null
  contractMissing: string[]
  probezeitMissing: string[]
  regulaerMissing: string[]
}) {
  const [form, setForm] = useState<'du' | 'sie'>('du')
  const [anrede, setAnrede] = useState<Anrede>(
    gender === 'MALE' ? 'herr' : gender === 'FEMALE' ? 'frau' : 'divers',
  )

  const cards: DocCard[] = [
    {
      key: 'vertrag',
      title: 'Arbeitsvertrag',
      desc: 'Universeller Anstellungsvertrag aus den Personalbogen-Daten.',
      href: (_f, a) => `/vertrag-druck/${userId}?anrede=${a}`,
      missing: contractMissing,
    },
    {
      key: 'kuendigung-probezeit',
      title: 'Kündigung (Probezeit)',
      desc: 'Kündigung innerhalb der Probezeit, Frist zwei Wochen.',
      href: (f) => `/kuendigung-druck/${userId}?art=probezeit&form=${f}`,
      missing: probezeitMissing,
    },
    {
      key: 'kuendigung-regulaer',
      title: 'Kündigung (regulär)',
      desc: 'Ordentliche Kündigung nach Probezeit, gesetzliche Frist (§ 622 BGB).',
      href: (f) => `/kuendigung-druck/${userId}?art=regulaer&form=${f}`,
      missing: regulaerMissing,
    },
    {
      key: 'abmahnung',
      title: 'Abmahnung',
      desc: 'Formelle Abmahnung bei Pflichtverletzungen.',
      missing: [],
      soon: true,
    },
    {
      key: 'beurteilung',
      title: 'Beurteilung / Growchat',
      desc: 'Mitarbeiterbeurteilung & Entwicklungsgespräch.',
      missing: [],
      soon: true,
    },
  ]

  return (
    <div>
      {/* Anrede-Umschalter (nur Kündigungen) */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Du/Sie in Kündigungen:</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {(['du', 'sie'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setForm(f)}
              className={`px-3 py-1 text-sm transition ${
                form === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'du' ? 'Du' : 'Sie'}
            </button>
          ))}
        </div>
      </div>

      {/* Anrede im Vertragskopf */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Arbeitsvertrag für:</span>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {([['herr', 'Mann (der Angestellte)'], ['frau', 'Frau (die Angestellte)'], ['divers', 'Divers (neutral)']] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAnrede(k)}
              className={`px-3 py-1 text-sm transition ${
                anrede === k ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.key}
            className={`rounded-2xl border p-4 flex flex-col gap-2 ${
              c.soon ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-gray-900">{c.title}</h3>
              {c.soon ? (
                <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-200 text-gray-500">
                  bald
                </span>
              ) : (
                <ReadyBadge missing={c.missing} />
              )}
            </div>
            <p className="text-sm text-gray-500 flex-1">{c.desc}</p>
            {c.soon ? (
              <button
                disabled
                className="px-3 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed self-start"
              >
                Bald verfügbar
              </button>
            ) : (
              <a
                href={c.href!(form, anrede)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition self-start"
              >
                Erstellen / als PDF
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
