import Link from 'next/link'
import { listRecipes, isRecipesConfigured, type RecipeSummary } from '@/lib/notion/recipes'

export const metadata = { title: 'Rezepte – SimpleRoster' }

function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'amber' | 'green' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-green-50 text-green-700',
  }
  return <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${tones[tone]}`}>{children}</span>
}

function RecipeCard({ r, placeholder = '🥪' }: { r: RecipeSummary; placeholder?: string }) {
  return (
    <Link
      href={`/employee/recipes/${r.id.replace(/-/g, '')}`}
      className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-indigo-300 hover:shadow-sm transition active:scale-[0.99]"
    >
      <div className="aspect-[3/2] bg-gray-100 flex items-center justify-center overflow-hidden">
        {r.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.coverUrl} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-3xl">{placeholder}</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 text-sm leading-snug">{r.name}</h3>
          {r.price != null && (
            <span className="text-xs font-semibold text-gray-900 whitespace-nowrap">
              {r.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          )}
        </div>
        {(r.tags.length > 0 || r.allergens.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {r.tags.filter((t) => t !== 'NEW' && t !== 'Archiv').map((t) => (
              <Badge key={t} tone="green">{t}</Badge>
            ))}
            {r.allergens.map((a) => (
              <Badge key={a} tone="amber">{a}</Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export default async function RecipesPage() {
  if (!isRecipesConfigured()) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Rezepte</h1>
        <p className="text-sm text-gray-500 mt-6 rounded-xl border border-dashed border-gray-200 p-6 text-center">
          Die Rezepte werden gerade eingerichtet. 🧑‍🍳<br />
          Schau bald wieder vorbei.
        </p>
      </div>
    )
  }

  let groups
  try {
    groups = await listRecipes()
  } catch {
    return (
      <div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Rezepte</h1>
        <p className="text-sm text-red-600 mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          Die Rezepte konnten gerade nicht geladen werden. Bitte später erneut versuchen.
        </p>
      </div>
    )
  }

  const { sandwiches, sauces, drinks } = groups

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-gray-900">Rezepte</h1>
        <p className="text-sm text-gray-500 mt-0.5">Unsere aktuellen Sandwiches und Saucen.</p>
      </header>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Sandwiches <span className="text-gray-500">· {sandwiches.length}</span>
        </h2>
        {sandwiches.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Sandwiches gefunden.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sandwiches.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>

      {sauces.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Saucen & Dips <span className="text-gray-500">· {sauces.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {sauces.map((r) => (
              <RecipeCard key={r.id} r={r} />
            ))}
          </div>
        </section>
      )}

      {drinks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Getränke <span className="text-gray-500">· {drinks.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {drinks.map((r) => (
              <RecipeCard key={r.id} r={r} placeholder="☕" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
