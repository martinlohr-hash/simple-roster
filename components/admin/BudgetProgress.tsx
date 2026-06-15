'use client'

import { useState, useTransition } from 'react'
import { setBudget } from '@/app/actions/budget'
import { getBudgetStatus } from '@/lib/calculations'

type Budget = {
  period: 'WEEKLY' | 'MONTHLY'
  year: number
  weekOrMonth: number
  type: 'HOURS' | 'EUROS'
  amount: number
} | null

type Props = {
  budget: Budget
  actualHours: number
  actualEuros: number
  period: 'WEEKLY' | 'MONTHLY'
  year: number
  weekOrMonth: number
}

const inputClass =
  'px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

export default function BudgetProgress({
  budget,
  actualHours,
  actualEuros,
  period,
  year,
  weekOrMonth,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState<'HOURS' | 'EUROS'>(budget?.type ?? 'EUROS')
  const [amount, setAmount] = useState(budget?.amount != null ? String(budget.amount) : '')
  const [isPending, startTransition] = useTransition()

  const actual = type === 'HOURS' ? actualHours : actualEuros
  const budgetAmount = budget?.amount ?? 0
  const displayActual = budget?.type === 'HOURS' ? actualHours : actualEuros
  const status = budget ? getBudgetStatus(displayActual, budgetAmount) : 'green'
  const pct = budget && budgetAmount > 0 ? Math.min(100, (displayActual / budgetAmount) * 100) : 0

  const barColor =
    status === 'red' ? 'bg-red-500' : status === 'warning' ? 'bg-amber-400' : 'bg-green-500'

  function handleSave() {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    startTransition(async () => {
      await setBudget({ period, year, weekOrMonth, type, amount: parsed })
      setEditing(false)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-gray-500">
          {period === 'WEEKLY' ? 'Wochenbudget' : 'Monatsbudget'}
        </div>
        <button
          onClick={() => {
            if (editing) {
              setType(budget?.type ?? 'EUROS')
              setAmount(budget?.amount != null ? String(budget.amount) : '')
            }
            setEditing(!editing)
          }}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition active:scale-[0.97]"
        >
          {editing ? 'Abbrechen' : 'Bearbeiten'}
        </button>
      </div>

      {editing ? (
        <div className="flex gap-2 items-end flex-wrap">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'HOURS' | 'EUROS')}
            className={inputClass}
          >
            <option value="EUROS">Euro (€)</option>
            <option value="HOURS">Stunden (h)</option>
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="z.B. 5000"
            step="0.01"
            min="0"
            className={`${inputClass} w-32`}
          />
          <button
            onClick={handleSave}
            disabled={isPending || !amount}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition active:scale-[0.97]"
          >
            {isPending ? '...' : 'Speichern'}
          </button>
        </div>
      ) : budget ? (
        <>
          {status === 'warning' && (
            <div className="mb-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Achtung: 90 % des Budgets erreicht
            </div>
          )}
          {status === 'red' && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              Budget überschritten
            </div>
          )}
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-lg font-semibold text-gray-900">
              {budget.type === 'EUROS'
                ? `${displayActual.toFixed(2)} €`
                : `${displayActual.toFixed(1)} h`}
            </span>
            <span className="text-xs text-gray-500">
              von{' '}
              {budget.type === 'EUROS'
                ? `${budget.amount.toFixed(2)} €`
                : `${budget.amount} h`}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${pct}%`, transition: 'width 300ms var(--ease-out)' }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(1)} %</div>
        </>
      ) : (
        <p className="text-xs text-gray-400">
          Kein Budget gesetzt. Klicke &quot;Bearbeiten&quot; um eines festzulegen.
        </p>
      )}
    </div>
  )
}
