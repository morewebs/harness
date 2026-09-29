// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import {
  IconAlarmClockOutline16, IconApiOutline14, IconArchiveOutline20, IconFolderClose16,
  IconGoalOutline16, IconSendOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'

afterEach(cleanup)

// Icon components all share the IconProps signature; the barrel also exports
// non-icon atoms (different props shapes), so filter by prefix BEFORE typing.
const icons = Object.fromEntries(
  Object.entries(primitives).filter(([name]) => name.startsWith('Icon')),
) as Record<string, (p: primitives.IconProps) => React.JSX.Element>
const iconNames = Object.keys(icons)

describe('ic_ds_ icon set', () => {
  it('exports the full icon set (46 deepsuite + 21 figma extracts + seven product glyphs outside those sets)', () => {
    expect(iconNames.length).toBe(74)
  })

  it.each(iconNames)('%s renders an svg with currentColor fills and no hardcoded palette', (name) => {
    const Icon = icons[name]!
    const { container } = render(<Icon />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    const markup = container.innerHTML
    expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}"/)
    expect(markup).toContain('currentColor')
  })

  it('size and className props land on the root svg', () => {
    const { container } = render(<IconSendOutline16 size={20} className="x" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('20')
    expect(svg.getAttribute('height')).toBe('20')
    expect(svg.classList.contains('x')).toBe(true)
  })

  it('each glyph defaults to its own drawn size, not one set-wide default', () => {
    const api = render(<IconApiOutline14 />)
    expect(api.container.querySelector('svg')!.getAttribute('width')).toBe('14')
    const folder = render(<IconFolderClose16 />)
    expect(folder.container.querySelector('svg')!.getAttribute('width')).toBe('16')
    const archive = render(<IconArchiveOutline20 />)
    expect(archive.container.querySelector('svg')!.getAttribute('width')).toBe('20')
    const alarm = render(<IconAlarmClockOutline16 />)
    expect(alarm.container.querySelector('svg')!.getAttribute('width')).toBe('16')
  })

  it('renders reusable goal glyphs without document-global ids', () => {
    const { container } = render(<><IconGoalOutline16 /><IconGoalOutline16 /></>)
    expect(container.querySelector('[id]')).toBeNull()
    expect(container.querySelector('[clip-path]')).toBeNull()
  })
})

describe('BrandMark', () => {
  it('renders the mark tile with a per-instance gradient id', () => {
    const { container } = render(<><primitives.BrandMark /><primitives.BrandMark /></>)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(2)
    for (const svg of svgs) {
      expect(svg.getAttribute('viewBox')).toBe('0 0 32 32')
      expect(svg.getAttribute('width')).toBe('24')
      expect(svg.getAttribute('height')).toBe('24')
    }
    const gradientIds = [...container.querySelectorAll('linearGradient')].map(node => node.id)
    expect(gradientIds).toHaveLength(2)
    expect(new Set(gradientIds).size).toBe(2)
    // Both instances stroke through their own gradient reference.
    const strokes = [...container.querySelectorAll('path')].map(node => node.getAttribute('stroke'))
    expect(new Set(strokes).size).toBe(2)
    for (const id of gradientIds) {
      expect(strokes).toContain(`url(#${id})`)
    }
  })
})

describe('BrandWordmark', () => {
  it('renders the name alone without the mark by default', () => {
    const view = render(<primitives.BrandWordmark />)
    const svg = view.container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('69')
    expect(svg.getAttribute('viewBox')).toBe('0 0 69 24')
    expect(svg.querySelector('text')?.textContent).toBe('moreweb')
    expect(view.container.querySelectorAll('rect').length).toBe(0)

    view.rerender(<primitives.BrandWordmark includeMark />)
    const withMark = view.container.querySelector('svg')!
    expect(withMark.getAttribute('width')).toBe('100')
    expect(withMark.getAttribute('viewBox')).toBe('0 0 100 24')
    expect(withMark.querySelector('text')?.getAttribute('x')).toBe('32')
    // The mark rides inside the wordmark svg as a nested document.
    expect(withMark.querySelectorAll('rect').length).toBe(1)
  })
})
