/**
 * 全局持久化状态（zustand + persist）。
 * 语言、主题、侧边栏折叠、两个工具的参数与输入都会写入 localStorage。
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { JsonIndent } from '@/features/json/jsonUtils'
import { detectLocale, type Locale } from '@/locales/locale'
import { getInitialTheme, type ThemeMode } from '@/utils/theme'

export type JsonViewMode = 'text' | 'tree'
export type JsonOutputMode = 'pretty' | 'minify'

export interface JsonToolState {
  /** 输入框内容，持久化保存，刷新后不丢 */
  input: string
  indent: JsonIndent
  sortKeys: boolean
  view: JsonViewMode
  mode: JsonOutputMode
}

export interface FontToolState {
  keyword: string
  onlyPrivateUse: boolean
  previewSize: number
}

export interface AppState {
  locale: Locale
  theme: ThemeMode
  sidebarCollapsed: boolean
  json: JsonToolState
  font: FontToolState
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  toggleSidebar: () => void
  updateJson: (patch: Partial<JsonToolState>) => void
  updateFont: (patch: Partial<FontToolState>) => void
}

const initialJson: JsonToolState = {
  input: '',
  indent: 2,
  sortKeys: false,
  view: 'text',
  mode: 'pretty',
}

const initialFont: FontToolState = {
  keyword: '',
  onlyPrivateUse: false,
  previewSize: 28,
}

/** 持久化 key，index.html 中的防闪烁脚本依赖它 */
export const STORAGE_KEY = 'dev-toolbox:app'

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: detectLocale(),
      theme: getInitialTheme(),
      sidebarCollapsed: false,
      json: initialJson,
      font: initialFont,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      updateJson: (patch) => set({ json: { ...get().json, ...patch } }),
      updateFont: (patch) => set({ font: { ...get().font, ...patch } }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        json: state.json,
        font: state.font,
      }),
    },
  ),
)
