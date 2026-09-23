import i18n from '@/locales/i18n'
import { useAppStore } from '@/store/appStore'
import { applyTheme } from '@/utils/theme'

/**
 * 把持久化的全局状态同步到 DOM 与 i18n：
 * 首屏（含 localStorage 恢复的值）执行一次，之后每次变更都会跟随。
 */
export function setupAppSync(): void {
  const initial = useAppStore.getState()
  applyTheme(initial.theme)
  document.documentElement.lang = initial.locale

  useAppStore.subscribe((state, previous) => {
    if (state.theme !== previous.theme) applyTheme(state.theme)
    if (state.locale !== previous.locale) {
      document.documentElement.lang = state.locale
      void i18n.changeLanguage(state.locale)
    }
  })
}
