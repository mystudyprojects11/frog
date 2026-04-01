import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { speciesApi } from '../api/species'
import type { Species } from '../api/listings'

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Лёгкий уход',
  medium: 'Средний уход',
  hard: 'Сложный уход',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-frog-100 text-frog-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-600',
}

function SpeciesCard({ s }: { s: Species }) {
  return (
    <Link
      to={`/species/${s.id}`}
      className="bg-white rounded-2xl border border-frog-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      <div className="aspect-[4/3] bg-frog-50 overflow-hidden">
        {s.photo_url ? (
          <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🐸</div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1">
        <h3 className="font-semibold text-gray-900">{s.name}</h3>
        <p className="text-xs text-gray-400 italic">{s.latin_name}</p>
        <div className="mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[s.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
            {DIFFICULTY_LABELS[s.difficulty] ?? s.difficulty}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function SpeciesList() {
  const [species, setSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    speciesApi.list()
      .then(setSpecies)
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? species.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.latin_name.toLowerCase().includes(search.toLowerCase())
      )
    : species

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-frog-700">Справочник видов</h1>
        <span className="text-sm text-gray-400">{species.length} видов</span>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию или латыни..."
        className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-frog-400"
      />

      {loading ? (
        <div className="text-center text-gray-400 py-20">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <div className="text-5xl mb-3">🐸</div>
          <p>{search ? 'Ничего не найдено' : 'Справочник пока пуст'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((s) => <SpeciesCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  )
}
