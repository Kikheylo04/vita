/**
 * ══════════════════════════════════════════════════════════
 *  PLANTILLAS DEL SITIO PUBLICO
 * ══════════════════════════════════════════════════════════
 *
 *  Una plantilla NO es una copia del sitio: es una variacion de
 *  tipografia, color, forma y orden de secciones sobre los mismos
 *  componentes.
 *
 *  Se hizo asi a proposito. Cuatro plantillas como cuatro copias
 *  del codigo significan arreglar cada bug cuatro veces; como
 *  cuatro configuraciones, una correccion sirve para todas.
 *
 *  Cada plantilla define:
 *   · paleta y tipografia
 *   · redondeo y densidad
 *   · que secciones aparecen y en que orden
 */

export type TemplateId = 'classic' | 'moderno' | 'rustico' | 'minimal'

export type SectionId =
  | 'hero' | 'about' | 'featured' | 'gallery' | 'chef'
  | 'events' | 'testimonials' | 'cta' | 'hours'

export interface TemplatePalette {
  primary: string
  primaryLight: string
  gold: string
  dark: string
  dark2: string
  dark3: string
  text: string
  textLight: string
  fontHeading: string
  fontBody: string
}

export interface Template {
  id: TemplateId
  name: string
  /** Una linea para el selector del panel. */
  description: string
  palette: TemplatePalette
  /** Radio de bordes. 0 = esquinas rectas. */
  radius: string
  /** Espaciado vertical entre secciones. */
  sectionGap: string
  /** Mayusculas y espaciado en titulos de seccion. */
  headingTransform: 'none' | 'uppercase'
  headingSpacing: string
  /** Orden y presencia de secciones. Omitir una la oculta. */
  sections: SectionId[]
  /** Fuentes de Google que hay que cargar. */
  googleFonts: string
}

/** Todas las secciones, en el orden de la plantilla original. */
const ALL: SectionId[] = [
  'hero', 'about', 'featured', 'gallery', 'chef',
  'events', 'testimonials', 'cta', 'hours',
]

export const TEMPLATES: Record<TemplateId, Template> = {
  // ── Clasico: el diseño original ─────────────────────────
  classic: {
    id: 'classic',
    name: 'Clásico',
    description: 'Serif elegante sobre fondo oscuro. Para cocina tradicional y alta gama.',
    palette: {
      primary: '#9B2020',
      primaryLight: '#B52828',
      gold: '#D4A843',
      dark: '#0e0e0f',
      dark2: '#161618',
      dark3: '#1e1e21',
      text: '#e9e9ea',
      textLight: 'rgba(233, 233, 234, 0.55)',
      fontHeading: "'Playfair Display', serif",
      fontBody: "'Lato', sans-serif",
    },
    radius: '10px',
    sectionGap: '6rem',
    headingTransform: 'none',
    headingSpacing: '0',
    sections: ALL,
    googleFonts: 'family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700',
  },

  // ── Moderno: claro y directo ────────────────────────────
  moderno: {
    id: 'moderno',
    name: 'Moderno',
    description: 'Claro, geométrico y con mucho aire. Para cafeterías y cocina contemporánea.',
    palette: {
      primary: '#1F6F5C',
      primaryLight: '#2A8A73',
      gold: '#E07A3F',
      dark: '#fbfaf8',
      dark2: '#f2f0ec',
      dark3: '#e6e3dd',
      text: '#1a1a1a',
      textLight: 'rgba(26, 26, 26, 0.6)',
      fontHeading: "'Poppins', sans-serif",
      fontBody: "'Inter', sans-serif",
    },
    radius: '16px',
    sectionGap: '7rem',
    headingTransform: 'none',
    headingSpacing: '-0.02em',
    // Sin chef: una cafeteria rara vez tiene una figura que destacar.
    sections: ['hero', 'featured', 'about', 'gallery', 'testimonials', 'events', 'cta', 'hours'],
    googleFonts: 'family=Poppins:wght@500;600;700&family=Inter:wght@300;400;600',
  },

  // ── Rustico: cálido y artesanal ─────────────────────────
  rustico: {
    id: 'rustico',
    name: 'Rústico',
    description: 'Tonos tierra y trazo artesanal. Para parrillas, cantinas y cocina de campo.',
    palette: {
      primary: '#8A4B2A',
      primaryLight: '#A55C36',
      gold: '#C9922F',
      dark: '#1a1512',
      dark2: '#241d18',
      dark3: '#2f261f',
      text: '#efe6d9',
      textLight: 'rgba(239, 230, 217, 0.58)',
      fontHeading: "'Bitter', serif",
      fontBody: "'Karla', sans-serif",
    },
    radius: '4px',
    sectionGap: '5.5rem',
    headingTransform: 'uppercase',
    headingSpacing: '0.08em',
    sections: ALL,
    googleFonts: 'family=Bitter:wght@500;600;700&family=Karla:wght@300;400;600',
  },

  // ── Minimal: solo lo esencial ───────────────────────────
  minimal: {
    id: 'minimal',
    name: 'Minimalista',
    description: 'Blanco, tipografía grande y pocas secciones. Para menús cortos y barras.',
    palette: {
      primary: '#111111',
      primaryLight: '#2b2b2b',
      gold: '#7a7a7a',
      dark: '#ffffff',
      dark2: '#f6f6f6',
      dark3: '#ebebeb',
      text: '#111111',
      textLight: 'rgba(17, 17, 17, 0.52)',
      fontHeading: "'Archivo', sans-serif",
      fontBody: "'Archivo', sans-serif",
    },
    radius: '0',
    sectionGap: '8rem',
    headingTransform: 'uppercase',
    headingSpacing: '0.1em',
    // Deliberadamente corta: el atractivo de esta plantilla es lo
    // que deja fuera.
    sections: ['hero', 'featured', 'about', 'hours'],
    googleFonts: 'family=Archivo:wght@400;500;700;800',
  },
}

export const TEMPLATE_LIST = Object.values(TEMPLATES)

export function getTemplate(id?: string | null): Template {
  return TEMPLATES[(id ?? 'classic') as TemplateId] ?? TEMPLATES.classic
}

/**
 * Aplica la plantilla como variables CSS.
 *
 * Los colores del cliente (tenants.brand.theme) se pasan aparte y
 * pisan la paleta: la plantilla define la forma, el cliente el color.
 */
export function applyTemplate(t: Template, overrides?: Partial<TemplatePalette>) {
  const p = { ...t.palette, ...overrides }
  const root = document.documentElement.style

  root.setProperty('--color-primary', p.primary)
  root.setProperty('--color-primary-light', p.primaryLight)
  root.setProperty('--color-gold', p.gold)
  root.setProperty('--color-dark', p.dark)
  root.setProperty('--color-dark-2', p.dark2)
  root.setProperty('--color-dark-3', p.dark3)
  root.setProperty('--color-text', p.text)
  root.setProperty('--color-text-light', p.textLight)
  root.setProperty('--font-heading', p.fontHeading)
  root.setProperty('--font-body', p.fontBody)

  root.setProperty('--tpl-radius', t.radius)
  root.setProperty('--tpl-section-gap', t.sectionGap)
  root.setProperty('--tpl-heading-transform', t.headingTransform)
  root.setProperty('--tpl-heading-spacing', t.headingSpacing)

  // Marca la plantilla en el documento para reglas puntuales de CSS.
  document.documentElement.dataset.template = t.id

  loadFonts(t.googleFonts)
}

/** Carga las fuentes de la plantilla, si no estan ya. */
function loadFonts(query: string) {
  const id = 'tpl-fonts'
  const href = `https://fonts.googleapis.com/css2?${query}&display=swap`
  const existing = document.getElementById(id) as HTMLLinkElement | null

  if (existing) {
    if (existing.href !== href) existing.href = href
    return
  }
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}
