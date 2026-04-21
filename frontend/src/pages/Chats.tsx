import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { chatsApi, chatWsUrl, type Chat, type Message } from '../api/chats'
import { useAuthStore } from '../store/auth'
import { useChatsNotifStore } from '../store/chatsNotif'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export default function Chats() {
  const { id } = useParams<{ id?: string }>()
  const user = useAuthStore((s) => s.user)
  const refreshNotif = useChatsNotifStore((s) => s.refresh)

  const [chats, setChats] = useState<Chat[]>([])
  const [loadingChats, setLoadingChats] = useState(true)

  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [wsReady, setWsReady] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    setLoadingChats(true)
    chatsApi.list()
      .then(setChats)
      .finally(() => setLoadingChats(false))
  }, [user])

  useEffect(() => {
    if (!id || !user) return

    setLoadingMessages(true)
    setMessages([])
    chatsApi.messages(id)
      .then(setMessages)
      .finally(() => setLoadingMessages(false))

    chatsApi.markRead(id).then(() => {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)))
      refreshNotif()
    }).catch(() => {})

    const ws = new WebSocket(chatWsUrl(id))
    ws.onopen = () => setWsReady(true)
    ws.onclose = () => setWsReady(false)
    ws.onmessage = (ev) => {
      const msg: Message = JSON.parse(ev.data)
      setMessages((prev) => [...prev, msg])
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, last_message: msg } : c)))
      if (msg.sender_id !== user.id) {
        chatsApi.markRead(id).then(refreshNotif).catch(() => {})
      }
    }
    wsRef.current = ws

    return () => {
      ws.close()
      wsRef.current = null
      setWsReady(false)
    }
  }, [id, user, refreshNotif])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const selectedChat = chats.find((c) => c.id === id)
  const other = (chat: Chat) =>
    user && chat.buyer.id === user.id ? chat.seller : chat.buyer

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(text)
    setDraft('')
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🐸</div>
        <p className="text-gray-500 mb-4">Войдите, чтобы открыть чаты</p>
        <Link to="/login" className="text-frog-600 hover:underline">Войти</Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex-1 flex flex-col">
      <div className="bg-white border border-frog-100 rounded-2xl shadow-sm flex flex-1 overflow-hidden min-h-[70vh]">
        {/* Sidebar */}
        <aside className="w-full md:w-80 border-r border-frog-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-frog-100">
            <h2 className="font-bold text-frog-700">Чаты</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-6 text-center text-gray-400 text-sm">Загрузка...</div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                Пока нет чатов. Напиши продавцу со страницы объявления.
              </div>
            ) : (
              chats.map((chat) => {
                const peer = other(chat)
                const isActive = chat.id === id
                return (
                  <Link
                    key={chat.id}
                    to={`/chats/${chat.id}`}
                    className={`flex gap-3 px-4 py-3 border-b border-frog-50 hover:bg-frog-50 transition-colors ${
                      isActive ? 'bg-frog-50' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-frog-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                      {peer.avatar_url
                        ? <img src={peer.avatar_url} className="w-full h-full object-cover" alt="" />
                        : '🐸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-sm text-gray-900 truncate">{peer.username}</p>
                        {chat.last_message && (
                          <span className="text-[11px] text-gray-400 flex-shrink-0">
                            {formatTime(chat.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{chat.listing.title}</p>
                      {chat.last_message && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {chat.last_message.sender_id === user.id && 'Вы: '}
                          {chat.last_message.text}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </aside>

        {/* Main pane */}
        <section className="hidden md:flex flex-1 flex-col overflow-hidden">
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Выберите чат слева
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-frog-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-frog-100 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                  {other(selectedChat).avatar_url
                    ? <img src={other(selectedChat).avatar_url!} className="w-full h-full object-cover" alt="" />
                    : '🐸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{other(selectedChat).username}</p>
                  <Link
                    to={`/listings/${selectedChat.listing.id}`}
                    className="text-xs text-frog-600 hover:underline truncate block"
                  >
                    {selectedChat.listing.title}
                  </Link>
                </div>
                {!wsReady && <span className="text-[11px] text-gray-400">соединение...</span>}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 bg-frog-50/30">
                {loadingMessages ? (
                  <div className="m-auto text-gray-400 text-sm">Загрузка...</div>
                ) : messages.length === 0 ? (
                  <div className="m-auto text-gray-400 text-sm">Сообщений пока нет</div>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user.id
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                            mine
                              ? 'bg-frog-600 text-white rounded-br-md'
                              : 'bg-white border border-frog-100 text-gray-800 rounded-bl-md'
                          }`}
                        >
                          <div>{m.text}</div>
                          <div className={`text-[10px] mt-1 ${mine ? 'text-frog-100' : 'text-gray-400'} text-right`}>
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={send} className="border-t border-frog-100 p-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Напишите сообщение..."
                  disabled={!wsReady}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-frog-400 disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={!wsReady || !draft.trim()}
                  className="bg-frog-600 hover:bg-frog-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  Отправить
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
