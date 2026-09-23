/**
 * 语言类型与首屏语言探测。
 * 只依赖 i18next-browser-languagedetector，不感知项目内其它模块。
 */
import LanguageDetector from 'i18next-browser-languagedetector'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English',
}

const detector = new LanguageDetector()
detector.init({
  order: ['localStorage', 'navigator'],
  lookupLocalStorage: 'dev-toolbox:locale',
  caches: [],
})

/** 首屏语言：优先浏览器语言，最终由持久化的状态覆盖 */
export function detectLocale(): Locale {
  const detected = detector.detect()
  const candidates = Array.isArray(detected) ? detected : detected ? [detected] : []
  for (const item of candidates) {
    const value = String(item).toLowerCase()
    if (value.startsWith('zh')) return 'zh-CN'
    if (value.startsWith('en')) return 'en-US'
  }
  return 'zh-CN'
}
