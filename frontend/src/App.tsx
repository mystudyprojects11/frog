import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { useFavoritesStore } from './store/favorites'
import { useChatsNotifStore } from './store/chatsNotif'
import Login from './pages/Login'
import Register from './pages/Register'
import Listings from './pages/Listings'
import ListingDetail from './pages/ListingDetail'
import ListingCreate from './pages/ListingCreate'
import ListingEdit from './pages/ListingEdit'
import SpeciesList from './pages/Species'
import SpeciesDetail from './pages/SpeciesDetail'
import Favorites from './pages/Favorites'
import Profile from './pages/Profile'
import Chats from './pages/Chats'

function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const unread = useChatsNotifStore((s) => s.unread)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-white border-b border-frog-200 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-3xl">🐸</span>
        <span className="text-xl font-bold text-frog-700">Жабка</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm text-gray-600">
        <Link to="/listings" className="hover:text-frog-600 transition-colors">Объявления</Link>
        <Link to="/species" className="hover:text-frog-600 transition-colors">Виды</Link>
        {user && (
          <>
            <Link to="/chats" className="hover:text-frog-600 transition-colors relative inline-flex items-center gap-1">
              Чаты
              {unread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold leading-none rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <Link to="/favorites" className="hover:text-frog-600 transition-colors">Избранное</Link>
          </>
        )}
        {user ? (
          <>
            <Link to="/profile" className="text-frog-700 font-medium hover:text-frog-800 transition-colors">
              {user.username}
            </Link>
            <button onClick={handleLogout} className="hover:text-red-500 transition-colors">
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-frog-600 transition-colors">Войти</Link>
            <Link
              to="/register"
              className="bg-frog-600 hover:bg-frog-700 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}

function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <span className="text-8xl">🐸</span>
        <h1 className="text-4xl font-bold text-frog-700">Добро пожаловать в Жабку</h1>
        <p className="text-lg text-gray-500 max-w-md">
          Маркетплейс для любителей лягушек и жаб. Покупай, продавай и обменивайся питомцами.
        </p>
      </div>

      <div className="flex gap-4">
        <Link to="/listings" className="bg-frog-600 hover:bg-frog-700 text-white font-medium px-6 py-3 rounded-xl transition-colors">
          Смотреть объявления
        </Link>
        <Link to="/listings/new" className="border border-frog-600 text-frog-700 hover:bg-frog-100 font-medium px-6 py-3 rounded-xl transition-colors">
          Подать объявление
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8 text-sm text-gray-600">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-frog-100 flex flex-col items-center gap-2">
          <span className="text-3xl">🛒</span>
          <span className="font-medium text-gray-800">Купить</span>
          <span>Сотни объявлений от проверенных заводчиков</span>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-frog-100 flex flex-col items-center gap-2">
          <span className="text-3xl">🔄</span>
          <span className="font-medium text-gray-800">Обменяться</span>
          <span>Найди пару своей жабке или поменяй вид</span>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-frog-100 flex flex-col items-center gap-2">
          <span className="text-3xl">📖</span>
          <span className="font-medium text-gray-800">Узнать</span>
          <span>Справочник видов с советами по уходу</span>
        </div>
      </div>
    </main>
  )
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const user = useAuthStore((s) => s.user)
  const fetchFavorites = useFavoritesStore((s) => s.fetch)
  const clearFavorites = useFavoritesStore((s) => s.clear)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  useEffect(() => {
    if (user) fetchFavorites()
    else clearFavorites()
  }, [user, fetchFavorites, clearFavorites])

  const refreshNotif = useChatsNotifStore((s) => s.refresh)
  const resetNotif = useChatsNotifStore((s) => s.reset)

  useEffect(() => {
    if (!user) {
      resetNotif()
      return
    }
    refreshNotif()
    const t = setInterval(refreshNotif, 30000)
    return () => clearInterval(t)
  }, [user, refreshNotif, resetNotif])

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/new" element={<ListingCreate />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/listings/:id/edit" element={<ListingEdit />} />
          <Route path="/species" element={<SpeciesList />} />
          <Route path="/species/:id" element={<SpeciesDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/chats/:id" element={<Chats />} />
        </Routes>
        <footer className="text-center text-sm text-gray-400 py-6">
          Жабка © 2026
        </footer>
      </div>
    </BrowserRouter>
  )
}
