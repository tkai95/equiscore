/**
 * EquiScore logo — vector recreation of the brand mark so it stays sharp at any
 * size (replaces the low-resolution PNG). The monogram is the green bracket +
 * three tapering bars; the wordmark is the serif "EquiScore". Brand green is a
 * single constant so it matches the product green everywhere.
 *
 * Use `EquiScoreLogo` for the expanded sidebar / headers, and `EquiScoreMark`
 * (monogram only) for collapsed nav, mobile headers, favicons and loading states.
 */

const BRAND = '#123C35'
const SERIF = "Georgia, 'Times New Roman', 'Iowan Old Style', serif"

/** Shared monogram paths, drawn in a 64×58 box starting at (4,3). */
function Monogram() {
  return (
    <g transform="translate(4,3)">
      <path
        d="M 55 13 A 25 25 0 1 0 55 51"
        fill="none"
        stroke={BRAND}
        strokeWidth={10.5}
        strokeLinecap="round"
      />
      <rect x="22" y="23" width="30" height="5.6" rx="2.8" fill="#8FA491" />
      <rect x="22" y="31.2" width="25" height="5.6" rx="2.8" fill="#A4B4A4" />
      <rect x="22" y="39.4" width="20" height="5.6" rx="2.8" fill="#BAC6B7" />
    </g>
  )
}

/** Full lockup: monogram + wordmark. */
export function EquiScoreLogo({
  className,
  width = 140,
  title = 'EquiScore',
}: {
  className?: string
  width?: number
  title?: string
}) {
  return (
    <svg
      className={className}
      width={width}
      viewBox="0 0 306 60"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <Monogram />
      <text
        x="82"
        y="46"
        fontFamily={SERIF}
        fontSize="42"
        letterSpacing="-0.5"
        fill={BRAND}
      >
        EquiScore
      </text>
    </svg>
  )
}

/** Monogram only — for collapsed nav, mobile header, favicon, loading states. */
export function EquiScoreMark({
  className,
  size = 32,
  title = 'EquiScore',
}: {
  className?: string
  size?: number
  title?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 66 60"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <Monogram />
    </svg>
  )
}
