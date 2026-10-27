import Link from 'next/link'
import { prisma } from '@/lib/db'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

type Props = { params: Promise<{ token: string }> }

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params
  const user = await prisma.user.findUnique({ where: { resetToken: token } })

  const valid = user && user.resetTokenExpiry && user.resetTokenExpiry >= new Date()

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {valid ? (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Neues Passwort vergeben</h1>
              <p className="text-sm text-gray-500">
                Lege ein neues Passwort für dein Konto fest.
              </p>
            </div>
            <ResetPasswordForm token={token} email={user.email} />
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Link ungültig</h1>
              <p className="text-sm text-gray-500">
                Dieser Link zum Zurücksetzen ist ungültig oder abgelaufen. Bitte fordere
                einen neuen an.
              </p>
            </div>
            <Link
              href="/passwort-vergessen"
              className="block w-full text-center min-h-11 py-2.5 px-4 bg-indigo-600 text-white text-base font-semibold rounded-xl hover:bg-indigo-700 transition active:scale-[0.97]"
            >
              Neuen Link anfordern
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
