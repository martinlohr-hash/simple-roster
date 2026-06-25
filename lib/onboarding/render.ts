// Rendert eine Onboarding-Stufe in eine versandfertige E-Mail (HTML + Text).
// Der Body ist "Markdown-lite": Absätze (Leerzeile), **fett**, [text](url),
// Aufzählungen mit "- ", einfache Zeilenumbrüche. Platzhalter werden vor dem
// Rendern ersetzt: {{vorname}}, {{name}}, {{firma}}, {{dashboard}}.

import { COMPANY_BRAND } from '@/lib/company'

export type RenderableStep = {
  subject: string
  body: string
  ctaLabel?: string | null
  ctaUrl?: string | null
}

export type RenderContext = {
  firstName: string
  fullName: string
  baseUrl: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Ersetzt Platzhalter in einem Rohtext (vor jeglichem Escaping/Parsing).
function fillPlaceholders(raw: string, ctx: RenderContext): string {
  const dashboard = `${ctx.baseUrl}/employee/dashboard`
  return raw
    .replace(/\{\{\s*vorname\s*\}\}/gi, ctx.firstName)
    .replace(/\{\{\s*name\s*\}\}/gi, ctx.fullName)
    .replace(/\{\{\s*firma\s*\}\}/gi, COMPANY_BRAND)
    .replace(/\{\{\s*dashboard\s*\}\}/gi, dashboard)
}

// Inline-Formatierung innerhalb eines bereits HTML-escapeten Strings:
// **fett** und [text](url). URLs werden auf http(s) beschränkt.
function inlineFormat(escaped: string): string {
  let out = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) => {
    return `<a href="${url}" style="color:#4f46e5;text-decoration:underline;">${text}</a>`
  })
  return out
}

// Body → HTML-Blöcke. Trennung an Leerzeilen; ein Block, dessen Zeilen alle mit
// "- " beginnen, wird zur Liste, sonst Absatz (einzelne Umbrüche → <br>).
function bodyToHtml(body: string): string {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/)
  const html: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    const isList = lines.every((l) => /^\s*-\s+/.test(l))
    if (isList) {
      const items = lines
        .map((l) => l.replace(/^\s*-\s+/, ''))
        .map((l) => `<li style="margin:4px 0;">${inlineFormat(escapeHtml(l))}</li>`)
        .join('')
      html.push(`<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;color:#374151;">${items}</ul>`)
    } else {
      const inner = lines.map((l) => inlineFormat(escapeHtml(l))).join('<br />')
      html.push(`<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${inner}</p>`)
    }
  }
  return html.join('\n')
}

// Body → Klartext (Markdown-Auszeichnung entfernt, Links als "text (url)").
function bodyToText(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1 ($2)')
}

export function renderOnboardingEmail(
  step: RenderableStep,
  ctx: RenderContext,
): { subject: string; html: string; text: string } {
  const subject = fillPlaceholders(step.subject, ctx).trim()
  const filledBody = fillPlaceholders(step.body, ctx)

  const ctaUrlRaw = step.ctaUrl ? fillPlaceholders(step.ctaUrl, ctx).trim() : ''
  const ctaLabel = step.ctaLabel ? fillPlaceholders(step.ctaLabel, ctx).trim() : ''
  const hasCta = /^https?:\/\//.test(ctaUrlRaw) && ctaLabel !== ''

  const ctaHtml = hasCta
    ? `<p style="text-align:center;margin:28px 0;">
         <a href="${ctaUrlRaw}" style="background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:10px;display:inline-block;">${escapeHtml(ctaLabel)}</a>
       </p>`
    : ''

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">
    ${bodyToHtml(filledBody)}
    ${ctaHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
    <p style="font-size:12px;color:#9ca3af;">${escapeHtml(COMPANY_BRAND)}</p>
  </div>`

  const textParts = [bodyToText(filledBody)]
  if (hasCta) textParts.push('', `${ctaLabel}: ${ctaUrlRaw}`)
  textParts.push('', COMPANY_BRAND)

  return { subject, html, text: textParts.join('\n') }
}
