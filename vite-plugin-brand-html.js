/**
 * Sustituye los datos de marca en index.html al compilar.
 *
 * Por que hace falta:
 * index.html lo procesa el navegador antes de cargar la app, asi que
 * no puede leer brand.ts en tiempo de ejecucion. Sin esto, cada
 * instalacion tendria que editar a mano el titulo, las etiquetas de
 * redes sociales y el JSON-LD, y olvidarlo significa publicar el sitio
 * de un cliente con el SEO de otro.
 *
 * Se leen los valores del archivo de marca y se reemplazan los
 * marcadores %BRAND_*% del HTML.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Extrae un valor literal de brand.ts sin ejecutar el modulo. */
function readField(source, block, field) {
  // Se busca dentro del bloque correspondiente para no confundir
  // campos con el mismo nombre en objetos distintos.
  const blockMatch = source.match(new RegExp(`export const ${block}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!blockMatch) return ''
  const fieldMatch = blockMatch[1].match(new RegExp(`\\b${field}:\\s*['"\`]([^'"\`]*)['"\`]`))
  return fieldMatch ? fieldMatch[1] : ''
}

export default function brandHtml() {
  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      const src = readFileSync(resolve(process.cwd(), 'src/config/brand.ts'), 'utf-8')

      const name       = readField(src, 'BRAND', 'name') || 'Restaurante'
      const fullName   = readField(src, 'BRAND', 'fullName') || name
      const tagline    = readField(src, 'BRAND', 'tagline')
      const cuisine    = readField(src, 'BRAND', 'cuisine')
      const phone      = readField(src, 'CONTACT', 'phone')
      const email      = readField(src, 'CONTACT', 'email')
      const address    = readField(src, 'CONTACT', 'address')
      const hood       = readField(src, 'CONTACT', 'neighborhood')
      const city       = readField(src, 'CONTACT', 'cityFull')
      const zip        = readField(src, 'CONTACT', 'zip')
      const country    = readField(src, 'CONTACT', 'country') || 'MX'
      const lat        = readField(src, 'CONTACT', 'lat')
      const lng        = readField(src, 'CONTACT', 'lng')
      const instagram  = readField(src, 'SOCIAL', 'instagramUrl')
      const domain     = readField(src, 'SITE', 'domain')
      const ogImage    = readField(src, 'SITE', 'ogImage')
      const gaId       = readField(src, 'SITE', 'gaId')
      const currency   = readField(src, 'CURRENCY', 'code') || 'MXN'

      const place = [hood, city].filter(Boolean).join(', ')
      const description = [cuisine, place && `en ${place}`].filter(Boolean).join(' ') + '.'

      // El JSON-LD se arma aparte: omitir campos vacios es mejor que
      // publicar un dato falso que Google indexe.
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: fullName,
        description,
        ...(domain && { url: domain }),
        ...(phone && { telephone: phone }),
        ...(email && { email }),
        ...(ogImage && { image: ogImage }),
        ...(currency && { currenciesAccepted: currency }),
        ...(address && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: address,
            addressLocality: hood || city,
            addressRegion: city,
            postalCode: zip,
            addressCountry: country,
          },
        }),
        ...(lat && lng && {
          geo: { '@type': 'GeoCoordinates', latitude: Number(lat), longitude: Number(lng) },
        }),
        ...(instagram && { sameAs: [instagram] }),
      }

      const analytics = gaId
        ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    </script>`
        : '<!-- Analytics desactivado: SITE.gaId vacio en brand.ts -->'

      return html
        .replace(/\{\{BRAND_NAME\}\}/g, name)
        .replace(/\{\{BRAND_FULL_NAME\}\}/g, fullName)
        .replace(/\{\{BRAND_TAGLINE\}\}/g, tagline)
        .replace(/\{\{BRAND_DESCRIPTION\}\}/g, description)
        .replace(/\{\{BRAND_DOMAIN\}\}/g, domain)
        .replace(/\{\{BRAND_OG_IMAGE\}\}/g, ogImage)
        .replace(/\{\{BRAND_JSON_LD\}\}/g, JSON.stringify(jsonLd, null, 2))
        .replace(/\{\{BRAND_ANALYTICS\}\}/g, analytics)
    },
  }
}
