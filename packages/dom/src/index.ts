export type ElChild = Node | string | null | undefined | false

export type ElProps = {
  className?: string
  id?: string
  textContent?: string
  title?: string
  href?: string
  type?: string
  value?: string
  selected?: boolean
  /** CSS custom props / declarations via setProperty. */
  style?: Record<string, string>
}

/** Lightweight element factory: `el('div', { className }, childA, childB)`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElProps | null,
  ...children: ElChild[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)

  if (props) {
    if (props.className != null) node.className = props.className
    if (props.id != null) node.id = props.id
    if (props.textContent != null) node.textContent = props.textContent
    if (props.title != null) node.title = props.title
    if (props.type != null && node instanceof HTMLInputElement) {
      node.type = props.type
    }
    if (props.value != null) {
      if (node instanceof HTMLInputElement) node.value = props.value
      else if (node instanceof HTMLOptionElement) node.value = props.value
      else if (node instanceof HTMLSelectElement) node.value = props.value
    }
    if (props.selected != null && node instanceof HTMLOptionElement) {
      node.selected = props.selected
    }
    if (props.href != null && node instanceof HTMLAnchorElement) {
      node.href = props.href
    }
    if (props.style) {
      for (const [key, value] of Object.entries(props.style)) {
        node.style.setProperty(key, value)
      }
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue
    node.append(typeof child === 'string' ? child : child)
  }

  return node
}

type ElementConstructor<T extends Element> = {
  new (): T
  prototype: T
}

/** Require a DOM node matching selector and constructor. */
export function mustGet<T extends Element>(
  selector: string,
  ctor: ElementConstructor<T>,
): T {
  const node = document.querySelector(selector)
  if (!(node instanceof ctor)) {
    throw new Error(`Missing element: ${selector}`)
  }
  return node
}
