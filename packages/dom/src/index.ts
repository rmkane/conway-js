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
  role?: string
  ariaLabel?: string
  ariaHidden?: boolean | 'true' | 'false'
  ariaPressed?: boolean | 'true' | 'false'
  /** CSS custom props / declarations via setProperty. */
  style?: Record<string, string>
}

function assignIf<T>(
  value: T | null | undefined,
  apply: (value: T) => void,
): void {
  if (value != null) apply(value)
}

function setValue(node: HTMLElement, value: string): void {
  if (node instanceof HTMLInputElement) node.value = value
  else if (node instanceof HTMLOptionElement) node.value = value
  else if (node instanceof HTMLSelectElement) node.value = value
}

function applyStyle(node: HTMLElement, style: Record<string, string>): void {
  for (const [key, value] of Object.entries(style)) {
    node.style.setProperty(key, value)
  }
}

function applyAria(
  node: HTMLElement,
  name: string,
  value: boolean | string | undefined,
): void {
  if (value == null) return
  node.setAttribute(name, typeof value === 'boolean' ? String(value) : value)
}

function applyProps(node: HTMLElement, props: ElProps): void {
  assignIf(props.className, (v) => {
    node.className = v
  })
  assignIf(props.id, (v) => {
    node.id = v
  })
  assignIf(props.textContent, (v) => {
    node.textContent = v
  })
  assignIf(props.title, (v) => {
    node.title = v
  })
  assignIf(props.role, (v) => {
    node.setAttribute('role', v)
  })
  assignIf(props.value, (v) => setValue(node, v))
  assignIf(props.style, (v) => applyStyle(node, v))
  applyAria(node, 'aria-label', props.ariaLabel)
  applyAria(node, 'aria-hidden', props.ariaHidden)
  applyAria(node, 'aria-pressed', props.ariaPressed)

  if (props.type != null && node instanceof HTMLInputElement) {
    node.type = props.type
  }
  if (props.selected != null && node instanceof HTMLOptionElement) {
    node.selected = props.selected
  }
  if (props.href != null && node instanceof HTMLAnchorElement) {
    node.href = props.href
  }
}

function appendChildren(node: HTMLElement, children: ElChild[]): void {
  for (const child of children) {
    if (child == null || child === false) continue
    node.append(typeof child === 'string' ? child : child)
  }
}

/** Lightweight element factory: `el('div', { className }, childA, childB)`. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElProps | null,
  ...children: ElChild[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (props) applyProps(node, props)
  appendChildren(node, children)
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
