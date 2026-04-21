import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listingsApi, type Listing } from '../api/listings'
import { useAuthStore } from '../store/auth'
import { useFavoritesStore } from '../store/favorites'

const DEAL_TYPE_LABELS: Record<string, string> = {
  sale: 'Продажа',
  exchange: 'Обмен',
  free: 'Отдам даром',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isFavorite = useFavoritesStore((s) => (id ? s.ids.has(id) : false))
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    if (!id) return
    listingsApi.get(id)
      .then((l) => {
        setListing(l)
        const mainIdx = l.photos.findIndex((p) => p.is_main)
        setActivePhoto(mainIdx >= 0 ? mainIdx : 0)
      })
      .catch(() => setError('Объявление не найдено'))
  }, [id])

  if (error) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-red-500">{error}</div>
  }
  if (!listing) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-gray-400">Загрузка...</div>
  }

  const isOwner = user?.id === listing.seller.id
  const photoUrl = listing.photos[activePhoto]
    ? `${import.meta.env.VITE_MINIO_URL}/frog-photos/${listing.photos[activePhoto].s3_key}`
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/listings" className="text-sm text-frog-600 hover:underline mb-4 inline-block">
        ← Назад к объявлениям
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Photos */}
        <div className="flex flex-col gap-3">
          <div className="aspect-[4/3] bg-frog-50 rounded-2xl overflow-hidden border border-frog-100">
            {photoUrl ? (
              <img src={photoUrl} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">🐸</div>
            )}
          </div>
          {listing.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {listing.photos.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setActivePhoto(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                    i === activePhoto ? 'border-frog-500' : 'border-transparent'
                  }`}
                >
                  <img
                    src={`${import.meta.env.VITE_MINIO_URL}/frog-photos/${photo.s3_key}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            <div className="flex items-center gap-3 whitespace-nowrap">
              {!isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) return navigate('/login')
                    toggleFavorite(listing.id)
                  }}
                  title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
                  className="text-2xl leading-none"
                >
                  <span className={isFavorite ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}>
                    {isFavorite ? '♥' : '♡'}
                  </span>
                </button>
              )}
              {isOwner && (
                <Link
                  to={`/listings/${listing.id}/edit`}
                  className="text-sm text-frog-600 hover:underline"
                >
                  Редактировать
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold text-frog-700">
              {listing.deal_type === 'sale' && listing.price
                ? `${Number(listing.price).toLocaleString('ru')} ₽`
                : listing.deal_type === 'exchange'
                ? 'Обмен'
                : 'Бесплатно'}
            </span>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {DEAL_TYPE_LABELS[listing.deal_type]}
            </span>
          </div>

          {listing.city && (
            <p className="text-sm text-gray-500">📍 {listing.city}</p>
          )}

          {listing.description && (
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          )}

          {/* Species */}
          {listing.species && (
            <div className="bg-frog-50 rounded-xl p-4 flex flex-col gap-1 border border-frog-100">
              <p className="text-sm font-medium text-frog-700">{listing.species.name}</p>
              <p className="text-xs text-gray-400 italic">{listing.species.latin_name}</p>
              <p className="text-xs text-gray-500">
                Сложность ухода: {DIFFICULTY_LABELS[listing.species.difficulty] ?? listing.species.difficulty}
              </p>
            </div>
          )}

          {/* Seller */}
          <div className="border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-frog-100 flex items-center justify-center text-xl">
              {listing.seller.avatar_url
                ? <img src={listing.seller.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                : '🐸'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900">{listing.seller.username}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>{'★'.repeat(Math.round(listing.seller.rating))}{'☆'.repeat(5 - Math.round(listing.seller.rating))}</span>
                <span>{listing.seller.rating.toFixed(1)}</span>
                <span>· {listing.seller.reviews_count} отзывов</span>
              </div>
            </div>
            {listing.seller.city && (
              <span className="text-xs text-gray-400">{listing.seller.city}</span>
            )}
          </div>

          {!isOwner && user && (
            <button
              onClick={() => navigate(`/chats?listing=${listing.id}`)}
              className="bg-frog-600 hover:bg-frog-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Написать продавцу
            </button>
          )}
          {!user && (
            <Link
              to="/login"
              className="block text-center bg-frog-600 hover:bg-frog-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Войдите чтобы написать
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
