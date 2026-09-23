/**
 * i18next 初始化入口。
 * 各语言的词条放在 ./modules 下（新增语言：加一个词条文件 → 在 resources 里注册 → 在 locales/locale.ts 的
 * SUPPORTED_LOCALES 中登记）。语言切换由 store/sync.ts 驱动。
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { SUPPORTED_LOCALES } from '@/locales/locale'
import enUS from '@/locales/modules/en-US'
import zhCN from '@/locales/modules/zh-CN'
import { useAppStore } from '@/store/appStore'

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: useAppStore.getState().locale,
  fallbackLng: 'zh-CN',
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
