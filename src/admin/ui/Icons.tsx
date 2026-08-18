// Iconos de linea del panel. Heredan el color via currentColor.
//
// Convenciones del set:
//  - Rejilla de 24, area segura de 20 (margen de 2 por lado).
//  - Trazo jerarquico: 1.7 para el contorno, ~1.25 para el detalle interno.
//    El contraste entre ambos es lo que da lectura a 20px; un grosor
//    uniforme aplana el dibujo.
//  - Vertices redondeados (linecap/linejoin round) y radios generosos.
//  - Sin fill salvo puntos deliberados, que usan currentColor.

interface IconProps {
  size?: number
  /** Grosor del contorno. El detalle interno escala en proporcion. */
  strokeWidth?: number
}

const base = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

/** Grosor del detalle interno: mas fino que el contorno, con un piso legible. */
const detail = (sw: number) => Math.max(1.1, sw * 0.74)

export function IconDashboard({ size = 20, strokeWidth = 1.7 }: IconProps) {
  // Modulos de distinto tamano: se lee como un tablero, no como cuatro cuadros iguales.
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="3" y="3" width="7.5" height="9.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="6" rx="2" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="2" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="2" />
    </svg>
  )
}

export function IconCalendar({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="3" y="5.5" width="18" height="15.5" rx="2.5" />
      <path d="M3 10.5h18" strokeWidth={detail(strokeWidth)} />
      <path d="M8 3.2v4.2M16 3.2v4.2" />
      {/* Dias marcados: dan densidad al cuerpo, que antes quedaba vacio. */}
      <circle cx="8" cy="14.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconMenu({ size = 20, strokeWidth = 1.7 }: IconProps) {
  // Cubiertos: tenedor de tres puas y cuchillo de filo recto.
  // El anterior tenia dos puas y una hoja curvada que no se leia.
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M6.5 13.6V21" />
      <path d="M4 3v5.1a2.5 2.5 0 0 0 5 0V3" />
      <path d="M6.5 3v5.1" strokeWidth={detail(strokeWidth)} />
      <path d="M16.6 21v-7.2" />
      <path d="M16.6 13.8c2 0 3.1-1.3 3.1-4C19.7 6.5 18.4 3.7 16.6 3c-1.8.7-3.1 3.5-3.1 6.8 0 2.7 1.1 4 3.1 4z" />
    </svg>
  )
}

export function IconStar({ size = 20, strokeWidth = 1.7 }: IconProps) {
  // Estrella de cinco puntas simetrica sobre el centro (12,12). La anterior
  // era un poligono trazado a mano y se veia torcida a tamano pequeno.
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 3.2l2.72 5.51 6.08.89-4.4 4.29 1.04 6.05L12 17.1l-5.44 2.84 1.04-6.05-4.4-4.29 6.08-.89z" />
    </svg>
  )
}

export function IconEvent({ size = 20, strokeWidth = 1.7 }: IconProps) {
  // Copa de brindis: mas claro para "eventos" que el triangulo con destellos.
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M5.6 3.6h12.8l-1.1 4.2a5.4 5.4 0 0 1-10.6 0z" />
      <path d="M12 13.2V20" />
      <path d="M8 20.6h8" />
      <path d="M6.4 7.4h11.2" strokeWidth={detail(strokeWidth)} />
      <path d="M12 13.2a5.4 5.4 0 0 0 5.3-5.4" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconCart({ size = 20, strokeWidth = 1.7 }: IconProps) {
  // Bolsa de pedido: el carrito anterior tenia el asa desconectada de la
  // cesta, y la bolsa encaja mejor con pedidos de restaurante.
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M4.4 7.6h15.2l-1.1 11.7a2.2 2.2 0 0 1-2.2 2H7.7a2.2 2.2 0 0 1-2.2-2z" />
      <path d="M8.7 7.6V5.9a3.3 3.3 0 0 1 6.6 0v1.7" />
      <path d="M9.4 12.3h5.2" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconMail({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="2.5" y="4.8" width="19" height="14.4" rx="2.5" />
      <path d="M3.6 6.6l7.1 4.9a2.4 2.4 0 0 0 2.6 0l7.1-4.9" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconSettings({ size = 20, strokeWidth = 1.7 }: IconProps) {
  // Engranaje de 8 dientes en vez de los 12 de Feather: a 20px los dientes
  // finos se fundian en una masa borrosa.
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M10.3 2.8h3.4l.5 2.2 2 .8 1.9-1.2 2.4 2.4-1.2 1.9.8 2 2.2.5v3.4l-2.2.5-.8 2 1.2 1.9-2.4 2.4-1.9-1.2-2 .8-.5 2.2h-3.4l-.5-2.2-2-.8-1.9 1.2-2.4-2.4 1.2-1.9-.8-2-2.2-.5v-3.4l2.2-.5.8-2-1.2-1.9 2.4-2.4 1.9 1.2 2-.8z" />
      <circle cx="12" cy="12" r="3.1" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconBell({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M18.2 9.4c0 3.1.6 5 1.7 6.3.5.6.1 1.5-.7 1.5H4.8c-.8 0-1.2-.9-.7-1.5 1.1-1.3 1.7-3.2 1.7-6.3a6.2 6.2 0 1 1 12.4 0z" />
      <path d="M14.1 20.2a2.4 2.4 0 0 1-4.2 0" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconSearch({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="10.6" cy="10.6" r="6.9" />
      <path d="M15.7 15.7l4.8 4.8" />
    </svg>
  )
}

export function IconChevronDown({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M6.5 9.6l5.5 5.3 5.5-5.3" />
    </svg>
  )
}

export function IconChevronRight({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M9.6 6.5l5.3 5.5-5.3 5.5" />
    </svg>
  )
}

export function IconExternal({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M18.6 13.8v5a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 18.8V7.6a2.2 2.2 0 0 1 2.2-2.2h5" />
      <path d="M14.4 3.2H21v6.6" />
      <path d="M20.4 3.8l-8.5 8.5" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconGlobe({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.6 9.3h16.8M3.6 14.7h16.8" strokeWidth={detail(strokeWidth)} />
      <path d="M12 3.2c2.6 2.9 2.6 14.7 0 17.6M12 3.2c-2.6 2.9-2.6 14.7 0 17.6" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconHamburger({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  )
}

export function IconClock({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 6.9V12l3.4 2" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconPin({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M12 21.4c4.4-4.3 6.6-7.8 6.6-10.9a6.6 6.6 0 1 0-13.2 0c0 3.1 2.2 6.6 6.6 10.9z" />
      <circle cx="12" cy="10.3" r="2.5" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconCheckCircle({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M8.2 12.4l2.7 2.7 5-5.6" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconAlert({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.4v5.3" strokeWidth={detail(strokeWidth)} />
      <circle cx="12" cy="16.2" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconHourglass({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M6.5 3h11M6.5 21h11" />
      <path d="M8 3v3.4c0 2 4 3.6 4 5.6s-4 3.6-4 5.6V21M16 3v3.4c0 2-4 3.6-4 5.6s4 3.6 4 5.6V21" />
      {/* La arena acumulada marca que el tiempo corre: antes era un reloj vacio. */}
      <path d="M9.5 18.4h5" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconLogout({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M9.5 21H5.2A2.2 2.2 0 0 1 3 18.8V5.2A2.2 2.2 0 0 1 5.2 3h4.3" />
      <path d="M16.4 16.6L21 12l-4.6-4.6" />
      <path d="M20.4 12H9.3" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconUser({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <circle cx="12" cy="8.2" r="4.1" />
      <path d="M4.4 20.6a7.8 7.8 0 0 1 15.2 0" />
    </svg>
  )
}

export function IconIdCard({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="2.6" y="5" width="18.8" height="14" rx="2.4" />
      <circle cx="8.6" cy="10.9" r="2.1" strokeWidth={detail(strokeWidth)} />
      <path d="M5.2 16.1a3.7 3.7 0 0 1 6.8 0" strokeWidth={detail(strokeWidth)} />
      <path d="M15.1 10.2h3.6M15.1 13.6h3.6" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}

export function IconLock({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <rect x="4.4" y="10.3" width="15.2" height="10.5" rx="2.4" />
      <path d="M7.9 10.3V7.6a4.1 4.1 0 0 1 8.2 0v2.7" />
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconBox({ size = 20, strokeWidth = 1.7 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)}>
      <path d="M20.6 7.8v8.4a1.7 1.7 0 0 1-.9 1.5l-6.9 3.8a1.7 1.7 0 0 1-1.6 0l-6.9-3.8a1.7 1.7 0 0 1-.9-1.5V7.8a1.7 1.7 0 0 1 .9-1.5l6.9-3.8a1.7 1.7 0 0 1 1.6 0l6.9 3.8a1.7 1.7 0 0 1 .9 1.5z" />
      <path d="M3.6 7l8.4 4.6L20.4 7" strokeWidth={detail(strokeWidth)} />
      <path d="M12 21.2v-9.6" strokeWidth={detail(strokeWidth)} />
    </svg>
  )
}
