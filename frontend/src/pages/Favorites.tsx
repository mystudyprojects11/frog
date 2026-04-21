import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { favoritesApi } from '../api/favorites'
import type { ListingShort } from '../api/listings'
import { useAuthStore } from '../store/auth'
import { useFavoritesStore } from '../store/favorites'
import ListingCard from '../components/ListingCard'

export default function Favorites() {
  const user = useAuthStore((s) => s.user)
  const ids = useFavoritesStore((s) => s.ids)
  const [listings, setListings] = useState<ListingShort[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    favoritesApi.list()
      .then(setListings)
      .finally(() => setLoading(false))
  }, [user])

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🐸</div>
        <p className="text-gray-500 mb-4">Войдите, чтобы посмотреть избранное</p>
        <Link to="/login" className="text-frog-600 hover:underline">Войти</Link>
      </div>
    )
  }

  const visible = listings.filter((l) => ids.has(l.id))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-frog-700 mb-6">Избранное</h1>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Загрузка...</div>
      ) : visible.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <div className="text-5xl mb-3">🤍</div>
          <p>Пока ничего нет. Добавляй объявления сердечком.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  )
}
