/**
 * EquiScore logo — renders the brand SVGs from /public so they stay sharp at any
 * size. `EquiScoreLogo` is the full lockup (monogram + serif wordmark);
 * `EquiScoreMark` is the monogram only, for the collapsed rail, mobile header,
 * favicon and loading states.
 */

import Image from 'next/image'

// Intrinsic aspect ratios of the source SVGs (viewBox dimensions).
const FULL_RATIO = 358 / 1193 // height / width
const MARK_W_OVER_H = 288 / 358 // width / height (monogram is taller than wide)

/** Full lockup: monogram + wordmark. `width` drives the size. */
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
    <Image
      src="/EquiScore_Full_Logo.svg"
      alt={title}
      width={width}
      height={Math.round(width * FULL_RATIO)}
      priority
      className={className}
    />
  )
}

/** Monogram only. `size` is the rendered height. */
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
    <Image
      src="/EquiScore_Monogram.svg"
      alt={title}
      width={Math.round(size * MARK_W_OVER_H)}
      height={size}
      priority
      className={className}
    />
  )
}
