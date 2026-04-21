import client from './client'

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  text: string
  created_at: string
}

export interface ChatParticipant {
  id: string
  username: string
  avatar_url: string | null
}

export interface ChatListingInfo {
  id: string
  title: string
  main_photo: string | null
}

export interface Chat {
  id: string
  listing: ChatListingInfo
  buyer: ChatParticipant
  seller: ChatParticipant
  created_at: string
  last_message: Message | null
  unread_count: number
}

export const chatsApi = {
  list: () => client.get<Chat[]>('/chats/').then((r) => r.data),
  createOrGet: (listingId: string) =>
    client.post<Chat>(`/chats/${listingId}`).then((r) => r.data),
  messages: (chatId: string) =>
    client.get<Message[]>(`/chats/${chatId}/messages`).then((r) => r.data),
  markRead: (chatId: string) => client.post(`/chats/${chatId}/read`),
}

export function chatWsUrl(chatId: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
  const wsBase = base.replace(/^http/, 'ws')
  const token = localStorage.getItem('access_token') ?? ''
  return `${wsBase}/chats/${chatId}/ws?token=${encodeURIComponent(token)}`
}
