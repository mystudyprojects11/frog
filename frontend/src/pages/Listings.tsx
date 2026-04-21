import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listingsApi, type ListingShort } from '../api/listings'
import { speciesApi } from '../api/species'
import type { Species } from '../api/listings'
import ListingCard from '../components/ListingCard'

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [listings, setListings] = useState<ListingShort[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)

  const dealType = searchParams.get('deal_type') ?? ''
  const speciesId = searchParams.get('species_id') ?? ''
  const city = searchParams.get('city') ?? ''

  useEffect(() => {
    speciesApi.list().then(setSpecies).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (dealType) params.deal_type = dealType
    if (speciesId) params.species_id = speciesId
    if (city) params.city = city
    listingsApi.list(params)
      .then(setListings)
      .finally(() => setLoading(false))
  }, [dealType, speciesId, city])

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-frog-700">Объявления</h1>
        <Link
          to="/listings/new"
          className="bg-frog-600 hover:bg-frog-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Подать объявление
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={dealType}
          onChange={(e) => setFilter('deal_type', e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-frog-400"
        >
          <option value="">Все типы</option>
          <option value="sale">Продажа</option>
          <option value="exchange">Обмен</option>
          <option value="free">Отдам даром</option>
        </select>

        <select
          value={speciesId}
          onChange={(e) => setFilter('species_id', e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-frog-400"
        >
          <option value="">Все виды</option>
          {species.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <input
          value={city}
          onChange={(e) => setFilter('city', e.target.value)}
          placeholder="Город"
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400"
        />

        {(dealType || speciesId || city) && (
          <button
            onClick={() => setSearchParams({})}
            className="text-sm text-gray-400 hover:text-red-400 transition-colors px-2"
          >
            Сбросить
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Загрузка...</div>
      ) : listings.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <div className="text-5xl mb-3">🐸</div>
          <p>Объявлений не найдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  )
}
