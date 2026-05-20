import { useState, useEffect, useRef } from 'react'
import Navbar from './components/layout/nav/Navbar'
import Footer from './components/layout/footer/Footer'
import CookieBanner from './components/layout/ui/CookieBanner'
import FloatingMenu from './components/layout/ui/FloatingMenu'
import Hero from './components/sections/hero/Hero'
import About from './components/sections/about/About'
import Chef from './components/sections/about/Chef'
import FeaturedDishes from './components/sections/dining/FeaturedDishes'
import Gallery from './components/sections/dining/Gallery'
import Events from './components/sections/social/Events'
import Testimonials from './components/sections/social/Testimonials'
import CallToAction from './components/sections/cta/CallToAction'
import Hours from './components/sections/cta/Hours'
import Menu from './components/pages/main/Menu'
import Reservations from './components/pages/main/Reservations'
import Contact from './components/pages/main/Contact'
import Privacy from './components/pages/legal/Privacy'
import Order from './components/pages/main/Order'
import NotFound from './components/pages/error/NotFound'
import type { PageId, MenuCategory } from './types/types'
import { useLang } from './context/LangContext'
import styles from './App.module.css'
import { useRestaurant } from './context/RestaurantContext'

const KNOWN_PAGES: PageId[] = ['home', 'menu', 'reservaciones', 'contacto', 'privacidad', 'pedido']

export default function App() {
  const { lang } = useLang()
  const RESTAURANT = useRestaurant()
  const [activePage, setActivePage] = useState<PageId>('home')
  const [visiblePage, setVisiblePage] = useState<PageId>('home')
  const [menuFilter, setMenuFilter] = useState<MenuCategory>('Todo')
  const [fading, setFading] = useState(false)
  const pendingPage = useRef<{ page: PageId; filter?: MenuCategory } | null>(null)

  const pageTitles: Record<PageId, { es: string; en: string }> = {
    home:        { es: 'VITA', en: 'VITA' },
    menu:        { es: 'VITA | Menú', en: 'VITA | Menu' },
    reservaciones:{ es: 'VITA | Reservaciones', en: 'VITA | Reservations' },
    contacto:    { es: 'VITA | Contacto', en: 'VITA | Contact' },
    privacidad:  { es: 'VITA | Aviso de Privacidad', en: 'VITA | Privacy Policy' },
    pedido:      { es: 'VITA | Tu Pedido', en: 'VITA | Your Order' },
  }

  const metaDescriptions: Record<PageId, { es: string; en: string }> = {
    home:        { es: `${RESTAURANT.fullName}. Cocina italiana auténtica en ${RESTAURANT.neighborhood}, ${RESTAURANT.cityFull}. Reserva tu mesa hoy.`, en: `${RESTAURANT.fullName}. Authentic Italian cuisine in ${RESTAURANT.neighborhood}, Mexico City. Book your table today.` },
    menu:        { es: `Descubre el menú de ${RESTAURANT.name}: pastas frescas, carnes, mariscos, postres y vinos selectos.`, en: `Discover ${RESTAURANT.name}'s menu: fresh pastas, meats, seafood, desserts and curated wines.` },
    reservaciones:{ es: `Reserva tu mesa en ${RESTAURANT.name}. Martes a Domingo, 13:00–23:00. ${RESTAURANT.neighborhood}, ${RESTAURANT.city}.`, en: `Book your table at ${RESTAURANT.name}. Tuesday to Sunday, 13:00–23:00. ${RESTAURANT.neighborhood}, Mexico City.` },
    contacto:    { es: `Contáctanos en ${RESTAURANT.name} Restaurante. Teléfono, correo y ubicación en ${RESTAURANT.neighborhood}, ${RESTAURANT.city}.`, en: `Contact ${RESTAURANT.name} Restaurant. Phone, email and location in ${RESTAURANT.neighborhood}, Mexico City.` },
    privacidad:  { es: `Aviso de privacidad de ${RESTAURANT.name} Restaurante.`, en: `${RESTAURANT.name} Restaurant privacy policy.` },
    pedido:      { es: `Confirma tu pedido anticipado en ${RESTAURANT.name}.`, en: `Confirm your pre-order at ${RESTAURANT.name}.` },
  }

  useEffect(() => {
    const titles = pageTitles[visiblePage]
    document.title = titles ? (lang === 'es' ? titles.es : titles.en) : 'VITA'
    const desc = metaDescriptions[visiblePage]
    if (desc) {
      let el = document.querySelector('meta[name="description"]')
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', 'description'); document.head.appendChild(el) }
      el.setAttribute('content', lang === 'es' ? desc.es : desc.en)
    }
    document.documentElement.lang = lang
  }, [visiblePage, lang])

  const navigate = (page: PageId, filter?: MenuCategory) => {
    if (page === visiblePage && !filter) return
    pendingPage.current = { page, filter }
    setFading(true)
    setTimeout(() => {
      const p = pendingPage.current
      if (!p) return
      if (p.filter) setMenuFilter(p.filter)
      setActivePage(p.page)
      setVisiblePage(p.page)
      setFading(false)
      window.scrollTo({ top: 0 })
      pendingPage.current = null
    }, 220)
  }

  const goToMenu = (category: MenuCategory) => navigate('menu', category)

  return (
    <>
      <Navbar activePage={visiblePage} setActivePage={navigate} />
      <div className={`${styles.pageWrap} ${fading ? styles.fadeOut : styles.fadeIn}`}>
        {activePage === 'home' && (
          <>
            <Hero setActivePage={navigate} />
            <About />
            <FeaturedDishes setActivePage={navigate} />
            <Gallery goToMenu={goToMenu} />
            <Chef />
            <Events setActivePage={navigate} />
            <Testimonials />
            <CallToAction setActivePage={navigate} />
            <Hours />
          </>
        )}
        {activePage === 'menu' && <Menu initialFilter={menuFilter} setActivePage={navigate} />}
        {activePage === 'reservaciones' && <Reservations />}
        {activePage === 'contacto' && <Contact />}
        {activePage === 'privacidad' && <Privacy />}
        {activePage === 'pedido' && <Order setActivePage={navigate} />}
        {!KNOWN_PAGES.includes(activePage) && <NotFound setActivePage={navigate} />}
        <Footer setActivePage={navigate} />
      </div>
      <CookieBanner setActivePage={navigate} />
      <FloatingMenu />
    </>
  )
}
