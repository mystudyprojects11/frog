import { Link, useNavigate } from 'react-router-dom'
import type { ListingShort } from '../api/listings'
import { useAuthStore } from '../store/auth'
import { useFavoritesStore } from '../store/favorites'

const DEAL_TYPE_LABELS: Record<string, string> = {
  sale: 'Продажа',
  exchange: 'Обмен',
  free: 'Отдам даром',
}

const DEAL_TYPE_COLORS: Record<string, string> = {
  sale: 'bg-blue-100 text-blue-700',
  exchange: 'bg-yellow-100 text-yellow-700',
  free: 'bg-frog-100 text-frog-700',
}

const STATUS_LABELS: Record<string, string> = {
  sold: 'Продано',
  archived: 'В архиве',
}

export default function ListingCard({ listing }: { listing: ListingShort }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isFavorite = useFavoritesStore((s) => s.ids.has(listing.id))
  const toggleFavorite = useFavoritesStore((s) => s.toggle)

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    toggleFavorite(listing.id)
  }

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="bg-white rounded-2xl border border-frog-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      <div className="aspect-[4/3] bg-frog-50 overflow-hidden relative">
        {listing.main_photo ? (
          <img
            src={listing.main_photo}
            alt={listing.title}
            className={`w-full h-full object-cover ${listing.status !== 'active' ? 'opacity-60' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🐸</div>
        )}
        {STATUS_LABELS[listing.status] && (
          <span className="absolute top-2 left-2 bg-gray-800/80 text-white text-[11px] px-2 py-0.5 rounded-md">
            {STATUS_LABELS[listing.status]}
          </span>
        )}
        <button
          type="button"
          onClick={handleFavorite}
          title={isFavorite ? 'Убрать из избранного' : 'В избранное'}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-sm flex items-center justify-center text-lg transition-colors"
        >
          <span className={isFavorite ? 'text-red-500' : 'text-gray-300'}>
            {isFavorite ? '♥' : '♡'}
          </span>
        </button>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 leading-snug line-clamp-2">{listing.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${DEAL_TYPE_COLORS[listing.deal_type]}`}>
            {DEAL_TYPE_LABELS[listing.deal_type]}
          </span>
        </div>
        {listing.species && (
          <p className="text-xs text-gray-400 italic">{listing.species.latin_name}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-frog-700 text-lg">
            {listing.deal_type === 'sale' && listing.price
              ? `${Number(listing.price).toLocaleString('ru')} ₽`
              : listing.deal_type === 'exchange'
              ? 'Обмен'
              : 'Бесплатно'}
          </span>
          {listing.city && <span className="text-xs text-gray-400">{listing.city}</span>}
        </div>
      </div>
    </Link>
  )
}
