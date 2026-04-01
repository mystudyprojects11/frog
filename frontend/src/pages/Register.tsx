import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/auth'

// --- validators ---

interface PasswordRules {
  latinOnly: boolean
  minLength: boolean
  hasUpper: boolean
  hasDigit: boolean
  hasSpecial: boolean
}

function checkPassword(password: string): PasswordRules {
  return {
    latinOnly: password.length === 0 || /^[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]+$/.test(password),
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password),
  }
}

function isPasswordValid(rules: PasswordRules): boolean {
  return Object.values(rules).every(Boolean)
}

const PASSWORD_RULES: { key: keyof PasswordRules; label: string }[] = [
  { key: 'latinOnly', label: 'Только латинские буквы, цифры и спецсимволы' },
  { key: 'minLength', label: 'Не менее 8 символов' },
  { key: 'hasUpper', label: 'Минимум одна заглавная латинская буква' },
  { key: 'hasDigit', label: 'Минимум одна цифра' },
  { key: 'hasSpecial', label: 'Минимум один спецсимвол (!@#$%...)' },
]

function validateEmail(email: string): string | null {
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : 'Некорректный email'
}

function validatePhone(phone: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return /^[78]\d{10}$/.test(digits) ? null : 'Формат: +7 (XXX) XXX-XX-XX'
}

// --- component ---

export default function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [form, setForm] = useState({ email: '', username: '', password: '', city: '', phone: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const passwordRules = checkPassword(form.password)
  const emailError = validateEmail(form.email)
  const phoneError = validatePhone(form.phone)

  const handleChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleBlur = (field: string) => () =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, phone: true })
    if (!isPasswordValid(passwordRules) || emailError || phoneError) return

    setError(null)
    setLoading(true)
    try {
      await authApi.register({
        email: form.email,
        username: form.username,
        password: form.password,
        city: form.city || undefined,
        phone: form.phone || undefined,
      })
      await login(form.email, form.password)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-frog-100 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-1 mb-6">
          <span className="text-4xl">🐸</span>
          <h1 className="text-xl font-bold text-frog-700">Создать аккаунт</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="text"
              required
              value={form.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              placeholder="you@example.com"
              className={`border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 ${
                touched.email && emailError ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {touched.email && emailError && (
              <p className="text-xs text-red-400">{emailError}</p>
            )}
          </div>

          {/* Username */}
          <Field
            label="Имя пользователя"
            value={form.username}
            onChange={handleChange('username')}
            onBlur={handleBlur('username')}
            placeholder="kermit"
            required
          />

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={handleChange('password')}
                onBlur={handleBlur('password')}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {(touched.password || form.password.length > 0) && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {PASSWORD_RULES.map(({ key, label }) => (
                  <li key={key} className={`text-xs flex items-center gap-1.5 ${passwordRules[key] ? 'text-frog-600' : 'text-red-400'}`}>
                    <span>{passwordRules[key] ? '✓' : '✗'}</span>
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* City */}
          <Field
            label="Город"
            value={form.city}
            onChange={handleChange('city')}
            onBlur={handleBlur('city')}
            placeholder="Москва"
          />

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Телефон</label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange('phone')}
              onBlur={handleBlur('phone')}
              placeholder="+7 900 000 00 00"
              className={`border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 ${
                touched.phone && phoneError ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {touched.phone && phoneError && (
              <p className="text-xs text-red-400">{phoneError}</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-frog-600 hover:bg-frog-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-frog-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
      />
    </div>
  )
}
