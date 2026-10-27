import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Passwort vergessen?</h1>
          <p className="text-sm text-gray-500">
            Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein
            neues Passwort vergeben kannst.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
