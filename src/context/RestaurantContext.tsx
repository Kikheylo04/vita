import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { RESTAURANT as DEFAULTS } from '../config/restaurant'

export type RestaurantConfig = typeof DEFAULTS

const RestaurantContext = createContext<RestaurantConfig>(DEFAULTS)

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RestaurantConfig>(DEFAULTS)

  useEffect(() => {
    supabase.from('config').select('key,value').then(({ data }) => {
      if (!data || data.length === 0) return
      const map: Record<string, string> = {}
      for (const row of data) map[row.key] = row.value

      setConfig({
        ...DEFAULTS,
        name:             map.name             ?? DEFAULTS.name,
        fullName:         map.full_name         ?? DEFAULTS.fullName,
        tagline:          map.tagline           ?? DEFAULTS.tagline,
        taglineFull:      map.full_name ? `${map.full_name} · dal ${map.founded_year ?? DEFAULTS.foundedYear}` : DEFAULTS.taglineFull,
        foundedYear:      map.founded_year      ?? DEFAULTS.foundedYear,
        phone:            map.phone             ?? DEFAULTS.phone,
        phoneRaw:         map.phone_raw         ?? DEFAULTS.phoneRaw,
        email:            map.email             ?? DEFAULTS.email,
        address:          map.address           ?? DEFAULTS.address,
        neighborhood:     map.neighborhood      ?? DEFAULTS.neighborhood,
        city:             map.city              ?? DEFAULTS.city,
        cityFull:         map.city_full         ?? DEFAULTS.cityFull,
        zip:              map.zip               ?? DEFAULTS.zip,
        mapsEmbed:        map.maps_embed        ?? DEFAULTS.mapsEmbed,
        instagram:        map.instagram         ?? DEFAULTS.instagram,
        instagramUrl:     map.instagram_url     ?? DEFAULTS.instagramUrl,
        facebookUrl:      map.facebook_url      ?? DEFAULTS.facebookUrl,
        chef: {
          name:     map.chef_name     ?? DEFAULTS.chef.name,
          title:    map.chef_title    ?? DEFAULTS.chef.title,
          titleEn:  map.chef_title_en ?? DEFAULTS.chef.titleEn,
        },
        hours: {
          note:    map.hours_note    ?? DEFAULTS.hours.note,
          noteEn:  map.hours_note_en ?? DEFAULTS.hours.noteEn,
          lunch:   map.hours_lunch   ?? DEFAULTS.hours.lunch,
          dinner:  map.hours_dinner  ?? DEFAULTS.hours.dinner,
        },
        whatsappMessage:   `Hola, me gustaría hacer una reservación en ${map.name ?? DEFAULTS.name}.`,
        whatsappMessageEn: `Hello, I would like to make a reservation at ${map.name ?? DEFAULTS.name}.`,
        currency:         map.currency         ?? DEFAULTS.currency,
        currencySymbol:   map.currency_symbol  ?? DEFAULTS.currencySymbol,
        currencyLocale:   map.currency_locale  ?? DEFAULTS.currencyLocale,
        baseIn:           DEFAULTS.baseIn,
        usdRate:          map.usd_rate ? Number(map.usd_rate) : DEFAULTS.usdRate,
      })
    })
  }, [])

  return (
    <RestaurantContext.Provider value={config}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  return useContext(RestaurantContext)
}

export function useFormatPrice() {
  const { currency, currencyLocale, baseIn, usdRate } = useRestaurant()
  return (usdPrice: number): string => {
    const amount = baseIn === 'USD' ? usdPrice * usdRate : usdPrice
    return new Intl.NumberFormat(currencyLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
}
