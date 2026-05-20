// Shared TypeScript interfaces for the VITA restaurant app

export type PageId = 'home' | 'menu' | 'reservaciones' | 'contacto' | 'privacidad'

export type MenuCategory =
  | 'Todo'
  | 'Entradas'
  | 'Pastas'
  | 'Carnes'
  | 'Mariscos'
  | 'Postres'
  | 'Bebidas'

export interface MenuItem {
  cat: MenuCategory
  name: string
  desc: string
  price: number
  badge: string
  image?: string
}

export interface GalleryItem {
  color: string
  label: string
  emoji: string
  category: MenuCategory
  image: string
}

export interface NavLink {
  id: PageId
  label: string
}

export interface ReservationForm {
  name: string
  email: string
  phone: string
  date: string
  time: string
  guests: string
  notes: string
}

export interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
}

export interface Feature {
  icon: string
  title: string
  desc: string
}

// Preparado para conectar a GET /api/testimonials
export interface Testimonial {
  id: string
  name: string
  role: string        // ej: "Cliente frecuente"
  avatar?: string     // URL de foto, opcional
  rating: number      // 1-5
  comment: string
  date: string        // ISO string desde backend
}

// Preparado para conectar a GET /api/events (futuro)
export interface SpecialEvent {
  id: string
  title: string
  date: string
  description: string
  imageUrl?: string
}
