/** Fill every `[data-app-version]` with `v{version}` from root package.json. */
export function mountAppVersion(root: ParentNode = document): void {
  const label = `v${__APP_VERSION__}`
  for (const el of root.querySelectorAll('[data-app-version]')) {
    el.textContent = label
  }
}
