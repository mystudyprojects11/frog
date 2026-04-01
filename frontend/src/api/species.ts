import client from './client'
import type { Species } from './listings'

export const speciesApi = {
  list: () => client.get<Species[]>('/species/').then((r) => r.data),
}
