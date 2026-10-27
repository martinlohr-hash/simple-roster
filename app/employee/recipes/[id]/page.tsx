import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRecipe, isRecipesConfigured, type RichRun, type RecipeBlock } from '@/lib/notion/recipes'

export const metadata = { title: 'Rezept – SimpleRoster' }

function Runs({ runs }: { runs: RichRun[] }) {
  return (
    <>
      {runs.map((r, i) => {
        const content = r.bold ? <strong>{r.text}</strong> : r.text
        if (r.href) {
          return (
            <a key={i} href={r.href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              {content}
            </a>
          )
        }
        return <span key={i}>{content}</span>
      })}
    </>
  )
}

// Aufeinanderfolgende Listen-Blöcke bündeln, damit echte <ul>/<ol> entstehen.
function renderBlocks(blocks: RecipeBlock[]) {
  const out: React.ReactNode[] = []
  let i = 0
  while (i < blocks.length) {
    const b = blocks[i]
    if (b.kind === 'bullet' || b.kind === 'numbered') {
      const kind = b.kind
      const items: RichRun[][] = []
      while (i < blocks.length && blocks[i].kind === kind) {
        items.push((blocks[i] as { runs: RichRun[] }).runs)
        i++
      }
      const cls = 'mt-1 mb-4 space-y-1 text-sm text-gray-700 leading-relaxed'
      out.push(
        kind === 'bullet' ? (
          <ul key={`l${i}`} className={`list-disc pl-5 ${cls}`}>
            {items.map((runs, j) => <li key={j}><Runs runs={runs} /></li>)}
          </ul>
        ) : (
          <ol key={`l${i}`} className={`list-decimal pl-5 ${cls}`}>
            {items.map((runs, j) => <li key={j} className="pl-1"><Runs runs={runs} /></li>)}
          </ol>
        ),
      )
      continue
    }

    switch (b.kind) {
      case 'heading':
        out.push(
          <h2 key={i} className="text-sm font-semibold text-gray-900 mt-5 mb-1">
            <Runs runs={b.runs} />
          </h2>,
        )
        break
      case 'paragraph':
        out.push(
          <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3">
            <Runs runs={b.runs} />
          </p>,
        )
        break
      case 'image':
        out.push(
          <figure key={i} className="my-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt={b.caption || 'Rezeptbild'} className="w-full rounded-xl border border-gray-200" loading="lazy" />
            {b.caption && <figcaption className="text-xs text-gray-500 mt-1 text-center">{b.caption}</figcaption>}
          </figure>,
        )
        break
      case 'divider':
        out.push(<hr key={i} className="my-4 border-gray-100" />)
        break
    }
    i++
  }
  return out
}

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isRecipesConfigured()) notFound()

  let recipe
  try {
    recipe = await getRecipe(id)
  } catch {
    recipe = null
  }
  if (!recipe) notFound()

  return (
    <div>
      <Link href="/employee/recipes" className="text-sm text-indigo-600 inline-flex items-center gap-1 mb-3">
        ← Zurück zu den Rezepten
      </Link>

      <h1 className="text-xl font-semibold text-gray-900">{recipe.name}</h1>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {recipe.price != null && (
          <span className="text-sm font-semibold text-gray-900">
            {recipe.price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
          </span>
        )}
        {recipe.breads.map((b) => (
          <span key={b} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{b}</span>
        ))}
        {recipe.tags.filter((t) => t !== 'NEW' && t !== 'Archiv').map((t) => (
          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700">{t}</span>
        ))}
      </div>

      {recipe.allergens.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
          <span className="font-medium">Allergene:</span> {recipe.allergens.join(', ')}
        </p>
      )}

      <div className="mt-4">{renderBlocks(recipe.blocks)}</div>
    </div>
  )
}
