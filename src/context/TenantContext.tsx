import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { BRAND, CONTACT, SOCIAL, THEME, LOGO, SITE, applyTheme, type BrandTheme } from '../config/brand'

/** Identidad guardada en tenants.brand, con la forma de brand.ts. */
export interface TenantBrand {
  name?: string
  fullName?: string
  tagline?: string
  taglineEn?: string
  foundedYear?: string
  cuisine?: string
  phone?: string
  phoneRaw?: string
  email?: string
  address?: string
  neighborhood?: string
  city?: string
  mapsEmbed?: string
  instagramUrl?: string
  facebookUrl?: string
  whatsappPhone?: string
  logoUrl?: string
  logoKind?: 'text' | 'image'
  theme?: Partial<BrandTheme>
}

export interface Tenant {
  id: string
  slug: string
  name: string
  template: string
  status: 'trial' | 'active' | 'suspended' | 'cancelled'
  trial_ends_at: string
  brand: TenantBrand
}

interface TenantContextValue {
  tenant: Tenant | null
  /** Identidad ya combinada: lo del tenant sobre los valores de brand.ts. */
  brand: TenantBrand
  loading: boolean
  /** true cuando el host no corresponde a ninguna empresa activa. */
  notFound: boolean
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null, brand: {}, loading: true, notFound: false,
})

/**
 * En desarrollo no hay subdominio, asi que se permite forzar la
 * empresa con ?tenant=slug o VITE_DEFAULT_TENANT.
 */
function resolveSlug(): { host: string; slug: string | null } {
  const host = window.location.hostname
  const forced = new URLSearchParams(window.location.search).get('tenant')
  if (forced) return { host, slug: forced }

  const envDefault = import.meta.env.VITE_DEFAULT_TENANT as string | undefined
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
  if (isLocal) return { host, slug: envDefault ?? 'principal' }

  return { host, slug: null }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const { host, slug } = resolveSlug()

    const query = slug
      ? supabase.from('tenants').select('*').eq('slug', slug).maybeSingle()
      // En produccion el host manda: cubre subdominio y dominio propio.
      : supabase.from('tenants').select('*')
          .or(`custom_domain.eq.${host},slug.eq.${host.split('.')[0]}`)
          .maybeSingle()

    query.then(({ data, error }) => {
      setLoading(false)

      if (error) {
        console.error('Error resolviendo la empresa:', error.message)
        return
      }
      if (!data) { setNotFound(true); return }

      const t = data as Tenant
      if (t.status === 'suspended' || t.status === 'cancelled') {
        setNotFound(true)
        return
      }

      setTenant(t)

      // Los colores del cliente pisan los del archivo.
      if (t.brand?.theme) {
        applyTheme({ ...THEME, ...t.brand.theme })
      }
    })
  }, [])

  // brand.ts queda como respaldo: si la empresa no definio un campo,
  // se usa el del archivo en vez de mostrar un hueco.
  const brand: TenantBrand = {
    name:         tenant?.brand?.name         ?? tenant?.name ?? BRAND.name,
    fullName:     tenant?.brand?.fullName     ?? BRAND.fullName,
    tagline:      tenant?.brand?.tagline      ?? BRAND.tagline,
    taglineEn:    tenant?.brand?.taglineEn    ?? BRAND.taglineEn,
    foundedYear:  tenant?.brand?.foundedYear  ?? BRAND.foundedYear,
    cuisine:      tenant?.brand?.cuisine      ?? BRAND.cuisine,
    phone:        tenant?.brand?.phone        ?? CONTACT.phone,
    phoneRaw:     tenant?.brand?.phoneRaw     ?? CONTACT.phoneRaw,
    email:        tenant?.brand?.email        ?? CONTACT.email,
    address:      tenant?.brand?.address      ?? CONTACT.address,
    neighborhood: tenant?.brand?.neighborhood ?? CONTACT.neighborhood,
    city:         tenant?.brand?.city         ?? CONTACT.city,
    mapsEmbed:    tenant?.brand?.mapsEmbed    ?? CONTACT.mapsEmbed,
    instagramUrl: tenant?.brand?.instagramUrl ?? SOCIAL.instagramUrl,
    facebookUrl:  tenant?.brand?.facebookUrl  ?? SOCIAL.facebookUrl,
    whatsappPhone: tenant?.brand?.whatsappPhone ?? SOCIAL.whatsappPhone,
    logoUrl:      tenant?.brand?.logoUrl      ?? LOGO.url,
    logoKind:     tenant?.brand?.logoKind     ?? LOGO.kind,
    theme:        tenant?.brand?.theme,
  }

  // El titulo se actualiza aqui porque index.html es estatico y
  // no sabe que empresa se va a servir.
  useEffect(() => {
    if (brand.name) document.title = brand.name
  }, [brand.name])

  return (
    <TenantContext.Provider value={{ tenant, brand, loading, notFound }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}

/** Dominio publico de la empresa, para enlaces absolutos. */
export function tenantUrl(slug: string) {
  const base = import.meta.env.VITE_PLATFORM_DOMAIN as string | undefined
  return base ? `https://${slug}.${base}` : SITE.domain
}
