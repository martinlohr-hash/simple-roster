'use client'

import { useEffect, useState } from 'react'

type Platform = 'ios' | 'android' | 'desktop' | 'installed'

function detectPlatform(): Platform {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installed'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function IOSSteps() {
  return (
    <div className="space-y-3">
      <Step n={1} icon="↑">
        Tippe unten in Safari auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben)
      </Step>
      <Step n={2} icon="＋">
        Wähle <strong>»Zum Home-Bildschirm«</strong>
      </Step>
      <Step n={3} icon="✓">
        Tippe oben rechts auf <strong>»Hinzufügen«</strong>
      </Step>
    </div>
  )
}

function AndroidSteps() {
  return (
    <div className="space-y-3">
      <Step n={1} icon="⋮">
        Tippe oben rechts in Chrome auf das <strong>Menü</strong> (drei Punkte)
      </Step>
      <Step n={2} icon="＋">
        Wähle <strong>»Zum Startbildschirm hinzufügen«</strong>
      </Step>
      <Step n={3} icon="✓">
        Bestätige mit <strong>»Hinzufügen«</strong>
      </Step>
    </div>
  )
}

function DesktopHint() {
  return (
    <p className="text-sm text-gray-500 leading-relaxed">
      Öffne SimpleRoster auf deinem Handy im Browser und folge den Anweisungen dort, um die App auf dem Startbildschirm zu speichern.
    </p>
  )
}

function Step({ n, icon, children }: { n: number; icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
        {n}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed pt-0.5">
        <span className="inline-block w-5 text-center mr-1 text-base">{icon}</span>
        {children}
      </p>
    </div>
  )
}

export default function WelcomeModal({ userId, name }: { userId: string; name: string }) {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const key = `roster_welcome_${userId}`
  const firstName = name.split(' ')[0]

  useEffect(() => {
    if (!localStorage.getItem(key)) {
      setPlatform(detectPlatform())
      setVisible(true)
    }
  }, [key])

  function dismiss() {
    localStorage.setItem(key, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-indigo-600 px-6 pt-7 pb-6 text-white text-center">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-lg font-bold">Willkommen, {firstName}!</h2>
          <p className="text-indigo-200 text-sm mt-1.5 leading-relaxed">
            Hier stempelst du ein und aus, siehst deine Schichten und deine Stunden.
          </p>
        </div>

        {/* Install tip — hidden if already installed */}
        {platform !== 'installed' && (
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📱</span>
              <h3 className="text-sm font-semibold text-gray-900">App auf dem Startbildschirm speichern</h3>
            </div>
            {platform === 'ios' && <IOSSteps />}
            {platform === 'android' && <AndroidSteps />}
            {platform === 'desktop' && <DesktopHint />}
            <p className="text-xs text-gray-500 mt-3">
              So öffnest du SimpleRoster mit einem Tipp – ohne Browser.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4">
          <button
            onClick={dismiss}
            className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition"
          >
            Verstanden
          </button>
        </div>

      </div>
    </div>
  )
}
