/**
 * ══════════════════════════════════════════════════════════
 *  IDENTIDAD DEL RESTAURANTE — edita solo este archivo
 * ══════════════════════════════════════════════════════════
 *
 *  Este es el unico archivo que hay que tocar para instalar la
 *  plantilla en un restaurante nuevo. Nombre, colores, logo,
 *  contacto y textos salen de aqui.
 *
 *  Lo que NO va aqui:
 *  · El menu, los eventos y los testimonios se cargan desde
 *    Supabase y se editan en /admin.
 *  · Los datos de contacto tambien viven en la tabla `config`
 *    y el panel los sobreescribe en caliente. Lo de aqui es el
 *    valor inicial y el respaldo si la base no responde.
 *
 *  Ver INSTALACION.md para el procedimiento completo.
 */

export interface BrandConfig {
  /** Nombre corto. Aparece en el logo, titulos y mensajes. */
  name: string
  /** Nombre completo con lema, para SEO y pie de pagina. */
  fullName: string
  /** Lema corto bajo el nombre. */
  tagline: string
  taglineEn: string
  /** Ano de fundacion. Cadena vacia lo oculta. */
  foundedYear: string
  /** Tipo de cocina, para el texto de SEO. */
  cuisine: string
  cuisineEn: string
}

export interface BrandContact {
  phone: string
  /** Solo digitos, para tel: y WhatsApp. */
  phoneRaw: string
  email: string
  address: string
  neighborhood: string
  city: string
  cityFull: string
  zip: string
  country: string
  /** URL de iframe de Google Maps. Vacio oculta el mapa. */
  mapsEmbed: string
  /** Coordenadas para el JSON-LD. Vacias lo omiten. */
  lat: string
  lng: string
}

export interface BrandSocial {
  instagram: string
  instagramUrl: string
  facebookUrl: string
  /** Vacio oculta el boton flotante. */
  whatsappPhone: string
}

export interface BrandTheme {
  /** Color de acento principal: botones, enlaces, detalles. */
  primary: string
  primaryLight: string
  /** Acento secundario: precios, adornos, activos. */
  gold: string
  /** Fondos, de mas oscuro a menos. */
  dark: string
  dark2: string
  dark3: string
  text: string
  textLight: string
  /** Fuentes. Deben cargarse en index.html. */
  fontHeading: string
  fontBody: string
}

export interface BrandLogo {
  /**
   * 'text'  dibuja el nombre con la tipografia de titulos
   * 'image' usa logoUrl
   */
  kind: 'text' | 'image'
  /** Solo si kind = 'image'. Ruta en /public o URL absoluta. */
  url: string
  /** Palabra pequena sobre el nombre. Vacio la oculta. */
  eyebrow: string
}

// ══════════════════════════════════════════════════════════
//  1. IDENTIDAD
// ══════════════════════════════════════════════════════════
export const BRAND: BrandConfig = {
  name: 'VITA',
  fullName: 'VITA — Vera Italia Tavola Autentica',
  tagline: 'Vera Italia Tavola Autentica',
  taglineEn: 'True Italian Table',
  foundedYear: '2009',
  cuisine: 'Cocina italiana auténtica',
  cuisineEn: 'Authentic Italian cuisine',
}

// ══════════════════════════════════════════════════════════
//  2. CONTACTO Y UBICACION
// ══════════════════════════════════════════════════════════
export const CONTACT: BrandContact = {
  phone: '(55) 1234-5678',
  phoneRaw: '5512345678',
  email: 'hola@vitarestaurante.mx',
  address: 'Av. Presidente Masaryk 123',
  neighborhood: 'Polanco',
  city: 'CDMX',
  cityFull: 'Ciudad de México',
  zip: '11560',
  country: 'MX',
  mapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.661038875557!2d-99.19867492394963!3d19.432421581886825!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d201f2e4e6b28f%3A0x4a501367f076b8a8!2sAv.%20Presidente%20Masaryk%2C%20Polanco%2C%20Miguel%20Hidalgo%2C%2011560%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses!2smx!4v1700000000000',
  lat: '19.4324',
  lng: '-99.1987',
}

// ══════════════════════════════════════════════════════════
//  3. REDES SOCIALES
// ══════════════════════════════════════════════════════════
export const SOCIAL: BrandSocial = {
  instagram: 'vita.restaurante',
  instagramUrl: 'https://instagram.com/vita.restaurante',
  facebookUrl: 'https://facebook.com/vitarestaurante',
  whatsappPhone: '5215512345678',
}

// ══════════════════════════════════════════════════════════
//  4. COLORES Y TIPOGRAFIA
//  Se inyectan como variables CSS al arrancar la app.
// ══════════════════════════════════════════════════════════
export const THEME: BrandTheme = {
  primary: '#9B2020',
  primaryLight: '#B52828',
  gold: '#D4A843',
  dark: '#0f0c08',
  dark2: '#181410',
  dark3: '#201c16',
  text: '#e8e4dc',
  textLight: 'rgba(232, 228, 220, 0.55)',
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Lato', sans-serif",
}

// ══════════════════════════════════════════════════════════
//  5. LOGO
// ══════════════════════════════════════════════════════════
export const LOGO: BrandLogo = {
  kind: 'text',
  url: '',
  eyebrow: 'RESTAURANT',
}

// ══════════════════════════════════════════════════════════
//  6. HORARIOS Y OPERACION
// ══════════════════════════════════════════════════════════
export const HOURS = {
  note: 'Lunes cerrado',
  noteEn: 'Closed on Mondays',
  lunch: '13:00 – 16:00',
  dinner: '20:00 – 23:00',
  /** Dia de cierre: 0 domingo … 6 sabado. -1 = abre todos los dias. */
  closedDay: 1,
  /** Horarios que se ofrecen en reservaciones y pedidos. */
  slots: ['13:00', '13:30', '14:00', '14:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
  /** Maximo de comensales por reservacion en linea. */
  maxGuests: 8,
}

// ══════════════════════════════════════════════════════════
//  7. MONEDA
// ══════════════════════════════════════════════════════════
export const CURRENCY = {
  /** ISO 4217: MXN, USD, EUR, COP, ARS, CLP, PEN, BRL… */
  code: 'MXN',
  symbol: '$',
  /** Locale para Intl.NumberFormat. */
  locale: 'es-MX',
  /** Unidad en que estan escritos los precios del catalogo. */
  baseIn: 'USD' as 'USD' | 'local',
  /** Cuantas unidades de `code` equivale 1 USD. Solo si baseIn = 'USD'. */
  usdRate: 17,
}

// ══════════════════════════════════════════════════════════
//  8. SITIO
// ══════════════════════════════════════════════════════════
export const SITE = {
  /** Dominio con https y sin barra final. Para canonical y sitemap. */
  domain: 'https://vitarestaurante.mx',
  /** Idioma inicial. */
  defaultLang: 'es' as 'es' | 'en',
  /** false oculta el conmutador de idioma y deja solo defaultLang. */
  bilingual: true,
  /** Vacio desactiva Google Analytics. */
  gaId: 'G-GC03S65TEV',
  /** Imagen para redes sociales. */
  ogImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
}

// ══════════════════════════════════════════════════════════
//  9. MODULOS
//  Apaga lo que un restaurante no use.
// ══════════════════════════════════════════════════════════
export const FEATURES = {
  reservations: true,
  /** Pedido anticipado con carrito. */
  preOrder: true,
  events: true,
  testimonials: true,
  gallery: true,
  chef: true,
  chatbot: true,
  /** Requiere las migraciones de sucursales. */
  branches: true,
  /** Requiere las migraciones de inventario y recetas. */
  inventory: true,
}

/**
 * Aplica el tema como variables CSS en :root.
 * Se llama una vez al arrancar, antes del primer render.
 */
export function applyTheme(theme: BrandTheme = THEME) {
  const root = document.documentElement.style
  root.setProperty('--color-primary', theme.primary)
  root.setProperty('--color-primary-light', theme.primaryLight)
  root.setProperty('--color-gold', theme.gold)
  root.setProperty('--color-dark', theme.dark)
  root.setProperty('--color-dark-2', theme.dark2)
  root.setProperty('--color-dark-3', theme.dark3)
  root.setProperty('--color-text', theme.text)
  root.setProperty('--color-text-light', theme.textLight)
  root.setProperty('--font-heading', theme.fontHeading)
  root.setProperty('--font-body', theme.fontBody)
}
