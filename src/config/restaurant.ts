/**
 * Vista compuesta de la marca, con la forma que ya consumen los
 * componentes. La identidad real vive en brand.ts: edita ese.
 *
 * Se mantiene este archivo para no tocar los 20+ componentes que
 * ya lo importan, y porque RestaurantContext lo usa como respaldo
 * cuando la tabla `config` de Supabase no responde.
 */
import { BRAND, CONTACT, SOCIAL, HOURS, CURRENCY, SITE } from './brand'

export const RESTAURANT = {
  name: BRAND.name,
  fullName: BRAND.fullName,
  tagline: BRAND.tagline,
  taglineFull: BRAND.foundedYear
    ? `${BRAND.tagline} · dal ${BRAND.foundedYear}`
    : BRAND.tagline,
  foundedYear: BRAND.foundedYear,

  phone: CONTACT.phone,
  phoneRaw: CONTACT.phoneRaw,
  email: CONTACT.email,

  address: CONTACT.address,
  neighborhood: CONTACT.neighborhood,
  city: CONTACT.city,
  cityFull: CONTACT.cityFull,
  zip: CONTACT.zip,
  mapsEmbed: CONTACT.mapsEmbed,

  instagram: SOCIAL.instagram,
  instagramUrl: SOCIAL.instagramUrl,
  facebookUrl: SOCIAL.facebookUrl,

  chef: {
    name: 'Marco Rossi',
    title: 'Chef & Fundador',
    titleEn: 'Chef & Founder',
  },

  hours: {
    note: HOURS.note,
    noteEn: HOURS.noteEn,
    lunch: HOURS.lunch,
    dinner: HOURS.dinner,
  },

  whatsappMessage: `Hola, me gustaría hacer una reservación en ${BRAND.name}.`,
  whatsappMessageEn: `Hello, I would like to make a reservation at ${BRAND.name}.`,

  domain: SITE.domain,

  currency: CURRENCY.code,
  currencySymbol: CURRENCY.symbol,
  currencyLocale: CURRENCY.locale,
  baseIn: CURRENCY.baseIn,
  usdRate: CURRENCY.usdRate,
}

/** Convierte un precio base a la moneda configurada y lo formatea. */
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
