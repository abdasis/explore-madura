import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { TextInput } from '@/components/form/text-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'

type LoginLocationState = {
    from?: string
}

export default function LoginPage() {
    const { user, login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as LoginLocationState | null)?.from ?? '/dashboard'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (user) return <Navigate to={from} replace />

    const handleSubmit = async () => {
        const errors: { email?: string; password?: string } = {}
        const normalizedEmail = email.trim()

        if (!normalizedEmail) errors.email = 'Email wajib diisi.'
        else if (!normalizedEmail.includes('@')) errors.email = 'Format email belum benar.'
        if (!password) errors.password = 'Kata sandi wajib diisi.'

        setFieldErrors(errors)
        setFormError(null)
        if (Object.keys(errors).length > 0) return

        setIsSubmitting(true)

        try {
            await login(normalizedEmail, password)
            navigate(from, { replace: true })
        } catch (error) {
            setFormError(
                error instanceof ApiError
                    ? error.message
                    : 'Gagal masuk. Periksa koneksi lalu coba lagi.'
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <main className="grid min-h-svh place-items-center bg-muted px-4 py-10 dark:bg-background">
            <div className="w-full max-w-sm space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <div className="grid size-8 place-items-center rounded-md bg-primary text-xs font-semibold tracking-wide text-primary-foreground">
                        EM
                    </div>
                    <div className="leading-tight">
                        <p className="text-sm font-semibold tracking-tight">Explore Madura</p>
                        <p className="text-xs text-muted-foreground">Panel admin wisata</p>
                    </div>
                </div>

                <Card className="py-0">
                    <CardHeader className="border-b border-border px-5 py-4">
                        <CardTitle className="text-base">Masuk ke akun</CardTitle>
                        <CardDescription>
                            Gunakan email dan kata sandi akun admin kamu.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 py-4">
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault()
                                void handleSubmit()
                            }}
                        >
                            <TextInput
                                label="Email"
                                type="email"
                                value={email}
                                onChange={setEmail}
                                placeholder="nama@perusahaan.com"
                                autoComplete="email"
                                error={fieldErrors.email}
                                disabled={isSubmitting}
                                required
                            />
                            <TextInput
                                label="Kata sandi"
                                type="password"
                                value={password}
                                onChange={setPassword}
                                placeholder="Masukkan kata sandi"
                                autoComplete="current-password"
                                error={fieldErrors.password}
                                disabled={isSubmitting}
                                required
                            />

                            {formError ? (
                                <p role="alert" className="text-xs text-destructive">
                                    {formError}
                                </p>
                            ) : null}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? 'Memproses...' : 'Masuk'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}
