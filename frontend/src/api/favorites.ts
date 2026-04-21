import client from './client'
import type { ListingShort } from './listings'

export const favoritesApi = {
  list: () => client.get<ListingShort[]>('/favorites/').then((r) => r.data),
  add: (listingId: string) => client.post(`/favorites/${listingId}`),
  remove: (listingId: string) => client.delete(`/favorites/${listingId}`),
}
