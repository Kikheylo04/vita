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
import { parseLocation, buildPath } from './lib/routes'
import { useLang } from './context/LangContext'
import styles from './App.module.css'
import { useRestaurant } from './context/RestaurantContext'
import { BRAND } from './config/brand'

export default function App() {
  const { lang } = useLang()
  const RESTAURANT = useRestaurant()
  const initial = parseLocation(window.location.pathname, window.location.search)
  // page === null significa URL desconocida: se renderiza NotFound.
  const [activePage, setActivePage] = useState<PageId | null>(initial.page)
  const [visiblePage, setVisiblePage] = useState<PageId | null>(initial.page)
  const [menuFilter, setMenuFilter] = useState<MenuCategory>(initial.filter ?? 'Todo')
  const [fading, setFading] = useState(false)
  const pendingPage = useRef<{ page: PageId | null; filter?: MenuCategory } | null>(null)

  const pageTitles: Record<PageId, { es: string; en: string }> = {
    home:        { es: BRAND.name, en: BRAND.name },
    menu:        { es: `${BRAND.name} | Menú`, en: `${BRAND.name} | Menu` },
    reservaciones:{ es: `${BRAND.name} | Reservaciones`, en: `${BRAND.name} | Reservations` },
    contacto:    { es: `${BRAND.name} | Contacto`, en: `${BRAND.name} | Contact` },
    privacidad:  { es: `${BRAND.name} | Aviso de Privacidad`, en: `${BRAND.name} | Privacy Policy` },
    pedido:      { es: `${BRAND.name} | Tu Pedido`, en: `${BRAND.name} | Your Order` },
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
    const titles = visiblePage ? pageTitles[visiblePage] : null
    document.title = titles ? (lang === 'es' ? titles.es : titles.en) : BRAND.name
    const desc = visiblePage ? metaDescriptions[visiblePage] : null
    if (desc) {
      let el = document.querySelector('meta[name="description"]')
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', 'description'); document.head.appendChild(el) }
      el.setAttribute('content', lang === 'es' ? desc.es : desc.en)
    }
    document.documentElement.lang = lang

    // El canonical seguia apuntando siempre a la raiz.
    if (visiblePage) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
      link.href = new URL(buildPath(visiblePage), RESTAURANT.domain || window.location.origin).href
    }
  }, [visiblePage, lang])

  /** Cambia de pagina con el fundido y deja la URL sincronizada. */
  const transitionTo = (page: PageId | null, filter?: MenuCategory) => {
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

  const navigate = (page: PageId, filter?: MenuCategory) => {
    if (page === visiblePage && (!filter || filter === menuFilter)) return
    window.history.pushState({}, '', buildPath(page, filter))
    transitionTo(page, filter)
  }

  // Boton atras/adelante del navegador.
  useEffect(() => {
    const onPop = () => {
      const route = parseLocation(window.location.pathname, window.location.search)
      // Si solo cambio el filtro dentro del menu, no hace falta el fundido.
      if (route.page === visiblePage) {
        setMenuFilter(route.filter ?? 'Todo')
        return
      }
      transitionTo(route.page, route.filter ?? 'Todo')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [visiblePage])

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
        {activePage === null && <NotFound setActivePage={navigate} />}
        <Footer setActivePage={navigate} />
      </div>
      <CookieBanner setActivePage={navigate} />
      <FloatingMenu />
    </>
  )
}
