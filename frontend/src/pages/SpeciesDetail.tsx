import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
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

export default function SpeciesDetail() {
  const { id } = useParams<{ id: string }>()
  const [species, setSpecies] = useState<Species | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    speciesApi.get(id)
      .then(setSpecies)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-center text-gray-400 py-20">Загрузка...</div>
  }

  if (notFound || !species) {
    return (
      <div className="text-center text-gray-400 py-20">
        <div className="text-5xl mb-3">🐸</div>
        <p>Вид не найден</p>
        <Link to="/species" className="mt-4 inline-block text-frog-600 hover:underline text-sm">
          ← Назад к справочнику
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/species" className="text-sm text-frog-600 hover:underline mb-6 inline-block">
        ← Справочник видов
      </Link>

      <div className="bg-white rounded-2xl border border-frog-100 shadow-sm overflow-hidden">
        {species.photo_url ? (
          <img
            src={species.photo_url}
            alt={species.name}
            className="w-full max-h-80 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-frog-50 flex items-center justify-center text-7xl">🐸</div>
        )}

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{species.name}</h1>
              <p className="text-sm text-gray-400 italic mt-0.5">{species.latin_name}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full whitespace-nowrap ${DIFFICULTY_COLORS[species.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
              {DIFFICULTY_LABELS[species.difficulty] ?? species.difficulty}
            </span>
          </div>

          {species.description && (
            <p className="text-gray-600 leading-relaxed">{species.description}</p>
          )}

          <div className="pt-2">
            <Link
              to={`/listings?species_id=${species.id}`}
              className="inline-block bg-frog-600 hover:bg-frog-700 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
            >
              Смотреть объявления этого вида
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
