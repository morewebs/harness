import { useId } from 'react'
import type { IconProps } from './icons/props.ts'

/**
 * Render the moreweb mark: the gradient "m" glyph on its dark tile.
 * @param props.size - square edge in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the mark svg (aria-hidden; pair with the wordmark for accessibility).
 */
export function BrandMark({ size = 24, className }: IconProps) {
  const gradientId = `mw-mark-gradient-${useId()}`
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00e5ff" />
          <stop offset="0.55" stopColor="#bf00ff" />
          <stop offset="1" stopColor="#ff007f" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="#030005" />
      <path
        d="M7 23V12M7 15.5C7 12.6 8.6 11 10.8 11S14.6 12.6 14.6 15.5V23M14.6 15.5c0-2.9 1.6-4.5 3.8-4.5S22.2 12.6 22.2 15.5V23"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25.5" cy="21.5" r="1.6" fill="#00e5ff" />
    </svg>
  )
}
