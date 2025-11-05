// Manejo simple de tema: agrega/quita 'dark' en <html>
const KEY = 'ps_theme'

export function loadTheme() {
  const saved = localStorage.getItem(KEY)
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const theme = saved || (prefersDark ? 'dark' : 'light')
  apply(theme)
  return theme
}

export function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  const next = current === 'dark' ? 'light' : 'dark'
  apply(next)
  localStorage.setItem(KEY, next)
  return next
}

function apply(theme) {
  const html = document.documentElement
  if (theme === 'dark') html.classList.add('dark')
  else html.classList.remove('dark')
}
