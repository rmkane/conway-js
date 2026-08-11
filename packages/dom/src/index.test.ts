/** @vitest-environment happy-dom */

import { el, mustGet } from '@conway/dom'
import { describe, expect, it } from 'vitest'

describe('el', () => {
  it('creates an element with class and text', () => {
    const node = el('h3', { className: 'title', textContent: 'Block' })
    expect(node.tagName).toBe('H3')
    expect(node.className).toBe('title')
    expect(node.textContent).toBe('Block')
  })

  it('appends children and sets CSS variables', () => {
    const child = el('span', { textContent: 'x' })
    const node = el(
      'div',
      { className: 'board', style: { '--cols': '3', '--rows': '2' } },
      child,
    )
    expect(node.children).toHaveLength(1)
    expect(node.style.getPropertyValue('--cols')).toBe('3')
    expect(node.style.getPropertyValue('--rows')).toBe('2')
  })
})

describe('mustGet', () => {
  it('returns a matching element', () => {
    document.body.append(el('div', { id: 'root' }))
    expect(mustGet('#root', HTMLDivElement)).toBeInstanceOf(HTMLDivElement)
  })

  it('throws when the selector is missing', () => {
    expect(() => mustGet('#missing', HTMLDivElement)).toThrow(/Missing element/)
  })
})
