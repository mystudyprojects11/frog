import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'
import type { ListingShort } from '../api/listings'
import { useAuthStore } from '../store/auth'
import ListingCard from '../components/ListingCard'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar)
  const deleteAvatar = useAuthStore((s) => s.deleteAvatar)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [listings, setListings] = useState<ListingShort[]>([])
  const [loadingListings, setLoadingListings] = useState(true)

  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoadingListings(true)
    authApi.myListings()
      .then(setListings)
      .finally(() => setLoadingListings(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setPhone(user.phone ?? '')
    setCity(user.city ?? '')
  }, [user, editing])

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🐸</div>
        <p className="text-gray-500 mb-4">Войдите, чтобы посмотреть профиль</p>
        <Link to="/login" className="text-frog-600 hover:underline">Войти</Link>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateProfile({
        username: username !== user.username ? username : undefined,
        phone: phone !== (user.phone ?? '') ? (phone || null) : undefined,
        city: city !== (user.city ?? '') ? (city || null) : undefined,
      })
      setEditing(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (newPw !== confirmPw) {
      setPwError('Пароли не совпадают')
      return
    }
    setPwSaving(true)
    try {
      await authApi.changePassword(oldPw, newPw)
      setPwSuccess(true)
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      setPwOpen(false)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) setPwError(detail[0]?.msg ?? 'Ошибка')
      else setPwError(detail ?? 'Ошибка при смене пароля')
    } finally {
      setPwSaving(false)
    }
  }

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files || !files[0]) return
    setAvatarLoading(true)
    try {
      await uploadAvatar(files[0])
    } finally {
      setAvatarLoading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleAvatarDelete = async () => {
    if (!confirm('Удалить аватар?')) return
    setAvatarLoading(true)
    try {
      await deleteAvatar()
    } finally {
      setAvatarLoading(false)
    }
  }

  const memberSince = new Date(user.created_at).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-frog-100 shadow-sm p-6">
        {editing ? (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-frog-700">Редактировать профиль</h1>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Имя пользователя</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Телефон</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 999-99-99"
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Город</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-frog-600 hover:bg-frog-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-4">
            <div className="relative group w-20 h-20 flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-frog-100 flex items-center justify-center text-4xl overflow-hidden">
                {user.avatar_url
                  ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                  : '🐸'}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarLoading}
                title="Загрузить фото"
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
              >
                {avatarLoading ? '...' : 'Изменить'}
              </button>
              {user.avatar_url && !avatarLoading && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  title="Удалить"
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none"
                >
                  ×
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files)}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-frog-600 hover:underline whitespace-nowrap"
                >
                  Редактировать
                </button>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span className="text-yellow-500">
                  {'★'.repeat(Math.round(user.rating))}{'☆'.repeat(5 - Math.round(user.rating))}
                </span>
                <span>{user.rating.toFixed(1)}</span>
                <span>· {user.reviews_count} отзывов</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                <span>📧 {user.email}</span>
                {user.phone && <span>📱 {user.phone}</span>}
                {user.city && <span>📍 {user.city}</span>}
                <span className="text-gray-400">На Жабке с {memberSince}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-frog-100 shadow-sm p-6">
        {!pwOpen ? (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-700">Пароль</h2>
              {pwSuccess && <p className="text-xs text-frog-600 mt-1">Пароль обновлён</p>}
            </div>
            <button
              onClick={() => { setPwOpen(true); setPwSuccess(false) }}
              className="text-sm text-frog-600 hover:underline"
            >
              Сменить пароль
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-frog-700">Смена пароля</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Текущий пароль</label>
              <input
                type="password"
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Новый пароль</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
              <p className="text-xs text-gray-400">
                Минимум 8 символов, заглавная буква, цифра, спецсимвол
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Повторите новый пароль</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
              />
            </div>

            {pwError && <p className="text-red-500 text-sm">{pwError}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setPwOpen(false)
                  setPwError(null)
                  setOldPw(''); setNewPw(''); setConfirmPw('')
                }}
                disabled={pwSaving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={pwSaving}
                className="bg-frog-600 hover:bg-frog-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {pwSaving ? 'Сохранение...' : 'Сменить пароль'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-frog-700">Мои объявления</h2>
        <Link
          to="/listings/new"
          className="bg-frog-600 hover:bg-frog-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Подать объявление
        </Link>
      </div>

      {loadingListings ? (
        <div className="text-center text-gray-400 py-20">Загрузка...</div>
      ) : listings.length === 0 ? (
        <div className="text-center text-gray-400 py-20 bg-white rounded-2xl border border-frog-100">
          <div className="text-5xl mb-3">🐸</div>
          <p>У тебя пока нет объявлений</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  )
}
