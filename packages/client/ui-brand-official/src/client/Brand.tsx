import { BrandMark, BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the moreweb mark at the size requested by its host surface.
 * @param props.size - requested square edge in px.
 * @returns the brand mark svg.
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <BrandMark size={size} />
}

/**
 * Render the moreweb mark in the blank-session hero.
 * @param props.size - requested square edge in px.
 * @param props.className - host class for the surrounding mark geometry.
 * @returns the brand mark svg.
 */
export function OfficialHeroMark({ size, className }: HeroBrandMarkOwnerProps) {
  return <BrandMark size={size} className={className} />
}

/**
 * Render the moreweb name artwork without its independently slotted mark.
 * @returns the official name wordmark.
 */
export function OfficialBrandName() {
  return <BrandWordmark includeMark={false} />
}
