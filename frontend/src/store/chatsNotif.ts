import { create } from 'zustand'
import { chatsApi } from '../api/chats'

interface ChatsNotifState {
  unread: number
  refresh: () => Promise<void>
  reset: () => void
}

export const useChatsNotifStore = create<ChatsNotifState>((set) => ({
  unread: 0,

  refresh: async () => {
    if (!localStorage.getItem('access_token')) return
    try {
      const chats = await chatsApi.list()
      const total = chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0)
      set({ unread: total })
    } catch {}
  },

  reset: () => set({ unread: 0 }),
}))
