import type { IconProps } from './icons/props.ts'
import { BrandMark } from './BrandMark.tsx'

/** Display options for the official brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to lead with the brand mark; defaults to false. */
  includeMark?: boolean | undefined
}

const BRAND_NAME = 'moreweb'
/** Name-artwork width at the 24px design size: Poppins-thin 17px with -0.5px
 * tracking, plus slack so no engine's metrics clip the tail. */
const NAME_WIDTH = 68
/** Gap between the leading mark and the name, in design units. */
const MARK_GAP = 8

/**
 * Render the brand name wordmark.
 * @param props.size - height in px (default 24; width follows the artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to lead with the brand mark.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = false }: BrandWordmarkProps) {
  const nameWidth = (size * NAME_WIDTH) / 24
  const width = (includeMark ? size + MARK_GAP : 1) + nameWidth
  return (
    <svg
      width={width}
      height={size}
      className={className}
      viewBox={`0 0 ${width} 24`}
      fill="none"
      aria-hidden="true"
    >
      {includeMark && <BrandMark size={size} />}
      <text
        x={includeMark ? size + MARK_GAP : 1}
        y={17.2}
        fontFamily="'Poppins-thin', 'Poppins', sans-serif"
        fontWeight="100"
        fontSize="17"
        letterSpacing="-0.5px"
        fill="currentColor"
      >
        {BRAND_NAME}
      </text>
    </svg>
  )
}
