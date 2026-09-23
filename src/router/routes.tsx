import type { ReactElement } from 'react'
import type { RouteObject } from 'react-router'
import type { IconName } from '@/components/Icon/Icon'
import { HomePage } from '@/pages/HomePage/HomePage'
import { IconFontPage } from '@/pages/IconFontPage/IconFontPage'
import { JsonFormatterPage } from '@/pages/JsonFormatterPage/JsonFormatterPage'
import { NotFoundPage } from '@/pages/NotFoundPage/NotFoundPage'

/**
 * 路由的唯一配置处：路径常量、导航菜单、路由表都在这里。
 * 两点约定，避免循环依赖：
 * 1. 布局（AppLayout）的装配放在 router/index.tsx —— 这里不 import 组件布局，
 *    否则 routes ↔ AppLayout 互相引用；
 * 2. 被本文件引用的模块（各页面、AppLayout、Sidebar）不要在模块顶层读 ROUTES / APP_ROUTES，
 *    本文件求值时它们还没初始化（渲染期读、或调用 pathOf() 都没问题）。
 */

/** 路径常量：全项目只有这里出现路径字符串 */
export const ROUTES = {
  home: '/',
  iconFont: '/icon-font',
  jsonFormatter: '/json-formatter',
} as const

/** 路由 key，如 'iconFont' */
export type RouteKey = keyof typeof ROUTES

/** 路由路径，如 '/icon-font' */
export type RoutePath = (typeof ROUTES)[RouteKey]

/**
 * 把 RouteKey 或路径统一解析成路径：
 * pathOf('iconFont') / pathOf('/icon-font') 都得到 '/icon-font'，未登记的地址原样返回。
 */
export function pathOf(target: RouteKey | RoutePath | string): string {
  return Object.hasOwn(ROUTES, target) ? ROUTES[target as RouteKey] : target
}

/** 一条路由：路径 + 页面 + 导航栏元信息（导航栏与路由表共用这一份配置） */
export interface AppRoute {
  key: RouteKey
  path: RoutePath
  /** 导航文案的 i18n key */
  labelKey: string
  icon: IconName
  element: ReactElement
}

export const APP_ROUTES: AppRoute[] = [
  { key: 'home', path: ROUTES.home, labelKey: 'nav.home', icon: 'home', element: <HomePage /> },
  {
    key: 'iconFont',
    path: ROUTES.iconFont,
    labelKey: 'nav.iconFont',
    icon: 'font',
    element: <IconFontPage />,
  },
  {
    key: 'jsonFormatter',
    path: ROUTES.jsonFormatter,
    labelKey: 'nav.json',
    icon: 'braces',
    element: <JsonFormatterPage />,
  },
]

/** AppLayout 的子路由（不含布局本身，布局在 router/index.tsx 里套上） */
export const childRoutes: RouteObject[] = [
  ...APP_ROUTES.map((route) =>
    route.key === 'home'
      ? { index: true, element: route.element }
      : { path: route.path.slice(1), element: route.element },
  ),
  { path: '*', element: <NotFoundPage /> },
]
