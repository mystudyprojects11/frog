import { create } from 'zustand'
import { favoritesApi } from '../api/favorites'

interface FavoritesState {
  ids: Set<string>
  loaded: boolean
  fetch: () => Promise<void>
  toggle: (listingId: string) => Promise<void>
  clear: () => void
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  fetch: async () => {
    if (!localStorage.getItem('access_token')) return
    try {
      const listings = await favoritesApi.list()
      set({ ids: new Set(listings.map((l) => l.id)), loaded: true })
    } catch {}
  },

  toggle: async (listingId) => {
    const next = new Set(get().ids)
    const was = next.has(listingId)
    if (was) next.delete(listingId)
    else next.add(listingId)
    set({ ids: next })
    try {
      if (was) await favoritesApi.remove(listingId)
      else await favoritesApi.add(listingId)
    } catch {
      const rollback = new Set(get().ids)
      if (was) rollback.add(listingId)
      else rollback.delete(listingId)
      set({ ids: rollback })
    }
  },

  clear: () => set({ ids: new Set(), loaded: false }),
}))
