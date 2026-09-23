/** 主题工具：把主题写到 <html> 的 .dark 类上（Tailwind v4 暗色变体依赖它） */
export const THEME_MODES = ['light', 'dark'] as const

export type ThemeMode = (typeof THEME_MODES)[number]

export function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getInitialTheme(): ThemeMode {
  return getSystemTheme()
}

/** 把主题写到 <html> 上，Tailwind 的 dark: 变体依赖 .dark 类 */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}
