import { BRAND, LOGO, THEME } from '../../../config/brand'

interface LogoProps {
  /** Alto en pixeles. El ancho se ajusta al contenido. */
  height?: number
  /** Color del texto. Por defecto, blanco del tema. */
  color?: string
  /** Color de la palabra pequena superior. */
  eyebrowColor?: string
  className?: string
}

/**
 * Logo del restaurante.
 *
 * Con LOGO.kind = 'image' usa el archivo de LOGO.url; con 'text'
 * dibuja el nombre en la tipografia de titulos. El modo texto evita
 * que cada instalacion tenga que encargar un SVG, y funciona con
 * nombres de cualquier largo.
 */
export default function Logo({
  height = 60,
  color = '#fff',
  eyebrowColor,
  className,
}: LogoProps) {
  if (LOGO.kind === 'image' && LOGO.url) {
    return (
      <img
        src={LOGO.url}
        alt={BRAND.name}
        height={height}
        style={{ height, width: 'auto', display: 'block' }}
        className={className}
      />
    )
  }

  const hasEyebrow = LOGO.eyebrow.trim().length > 0
  // El nombre baja cuando no hay palabra superior, para que el
  // conjunto quede centrado en la caja.
  const nameY = hasEyebrow ? 46 : 40

  return (
    <svg
      viewBox="0 0 200 60"
      height={height}
      style={{ height, width: 'auto', display: 'block' }}
      className={className}
      role="img"
      aria-label={BRAND.name}
    >
      {hasEyebrow && (
        <text
          x="100" y="22"
          fontFamily={THEME.fontBody}
          fontSize="9"
          fill={eyebrowColor ?? THEME.gold}
          textAnchor="middle"
          letterSpacing="4"
        >
          {LOGO.eyebrow}
        </text>
      )}
      <text
        x="100" y={nameY}
        fontFamily={THEME.fontHeading}
        fontSize="30"
        fill={color}
        textAnchor="middle"
        letterSpacing="3"
      >
        {BRAND.name}
      </text>
    </svg>
  )
}
