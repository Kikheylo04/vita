export const RESTAURANT = {
  name: 'VITA',
  fullName: 'VITA — Vera Italia Tavola Autentica',
  tagline: 'Vera Italia Tavola Autentica',
  taglineFull: 'Vera Italia Tavola Autentica · dal 2009',
  foundedYear: '2009',

  phone: '(55) 1234-5678',
  phoneRaw: '5512345678',
  email: 'hola@vitarestaurante.mx',

  address: 'Av. Presidente Masaryk 123',
  neighborhood: 'Polanco',
  city: 'CDMX',
  cityFull: 'Ciudad de México',
  zip: '11560',
  mapsEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.661038875557!2d-99.19867492394963!3d19.432421581886825!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d201f2e4e6b28f%3A0x4a501367f076b8a8!2sAv.%20Presidente%20Masaryk%2C%20Polanco%2C%20Miguel%20Hidalgo%2C%2011560%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses!2smx!4v1700000000000',

  instagram: 'vita.restaurante',
  instagramUrl: 'https://instagram.com/vita.restaurante',
  facebookUrl: 'https://facebook.com/vitarestaurante',

  chef: {
    name: 'Marco Rossi',
    title: 'Chef & Fundador',
    titleEn: 'Chef & Founder',
  },

  hours: {
    note: 'Lunes cerrado',
    noteEn: 'Closed on Mondays',
    lunch: '13:00 – 16:00',
    dinner: '20:00 – 23:00',
  },

  whatsappMessage: 'Hola, me gustaría hacer una reservación en VITA.',
  whatsappMessageEn: 'Hello, I would like to make a reservation at VITA.',

  domain: 'https://vitarestaurante.mx',

  /**
   * Configuración de moneda
   * currency: código ISO 4217  (MXN, USD, EUR, COP, ARS, CLP, PEN, BRL…)
   * currencySymbol: símbolo visible ($, €, S/, R$…)
   * currencyLocale: locale para Intl.NumberFormat (es-MX, en-US, es-CO…)
   * baseIn: la unidad en que están escritos los precios en el código ('USD' o 'local')
   * usdRate: cuántas unidades de `currency` equivale 1 USD (solo si baseIn='USD')
   */
  currency: 'MXN',
  currencySymbol: '$',
  currencyLocale: 'es-MX',
  baseIn: 'USD' as 'USD' | 'local',
  usdRate: 17,
}

/** Convierte un precio base (USD) a la moneda configurada y lo formatea */
export function formatPrice(usdPrice: number): string {
  const amount = RESTAURANT.baseIn === 'USD'
    ? usdPrice * RESTAURANT.usdRate
    : usdPrice

  return new Intl.NumberFormat(RESTAURANT.currencyLocale, {
    style: 'currency',
    currency: RESTAURANT.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
