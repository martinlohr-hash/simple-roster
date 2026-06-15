'use client'

import { deleteTemplate } from '@/app/actions/templates'

export default function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  async function handle() {
    if (!confirm(`Vorlage «${name}» löschen?`)) return
    await deleteTemplate(id)
  }

  return (
    <button onClick={handle} className="text-xs text-red-500 hover:text-red-600 font-medium">
      Löschen
    </button>
  )
}
