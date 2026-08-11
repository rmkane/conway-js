type ElementConstructor<T extends Element> = {
  new (): T
  prototype: T
}

export function mustGet<T extends Element>(
  selector: string,
  ctor: ElementConstructor<T>,
): T {
  const el = document.querySelector(selector)
  if (!(el instanceof ctor)) {
    throw new Error(`Missing element: ${selector}`)
  }
  return el
}
