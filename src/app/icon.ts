import {
  createElement,
  Dices,
  Eraser,
  type IconNode,
  LocateFixed,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  type SVGProps,
} from 'lucide'

const DEFAULT_ATTRS: SVGProps = {
  class: 'size-4 shrink-0',
  width: 16,
  height: 16,
  'stroke-width': 2,
  'aria-hidden': 'true',
}

/** Create a Lucide SVG element for UI chrome. */
function lucideIcon(node: IconNode, attrs: SVGProps = {}): SVGElement {
  return createElement(node, { ...DEFAULT_ATTRS, ...attrs })
}

/** Replace a control’s contents with a single Lucide glyph. */
export function setButtonIcon(button: HTMLElement, node: IconNode): void {
  button.replaceChildren(lucideIcon(node))
}

export const glyphs = {
  play: Play,
  pause: Pause,
  reset: RotateCcw,
  clear: Eraser,
  center: LocateFixed,
  prev: StepBack,
  next: StepForward,
  seed: Dices,
} as const
