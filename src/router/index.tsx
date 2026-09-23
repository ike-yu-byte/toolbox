import { createHashRouter, type NavigateOptions } from 'react-router'
import { AppLayout } from '@/components/AppLayout/AppLayout'
import { childRoutes, pathOf, ROUTES, type RouteKey, type RoutePath } from '@/router/routes'

/**
 * 全局路由实例：把 routes.tsx 的路由表装配到 AppLayout 之下。
 * 用 hash 模式，部署到任意静态目录都不用配 nginx rewrite。
 *
 * 跳转方式有两种，按场景选：
 * - 组件 / JSX 里：<Link>、<NavLink>、useNavigate（保留 a 标签语义，可中键新窗口打开）
 * - 非组件逻辑（store action、请求回调、事件工具函数）：下面的 navigateTo / replaceTo / goBack
 *
 * 注意：本文件会 import AppLayout，所以视图层（AppLayout / Sidebar）请直接从
 * '@/router/routes' 取导航配置，不要从这里 import，否则形成循环依赖。
 */
export const router = createHashRouter([
  {
    path: ROUTES.home,
    element: <AppLayout />,
    children: childRoutes,
  },
])

/** 编程式跳转，入参可以是 RouteKey（'iconFont'）或路径（'/icon-font'） */
export function navigateTo(
  target: RouteKey | RoutePath | string,
  options?: NavigateOptions,
): Promise<void> {
  return router.navigate(pathOf(target), options)
}

/** 替换当前历史记录，用于登录后跳转等不想留下返回栈的场景 */
export function replaceTo(
  target: RouteKey | RoutePath | string,
  options?: NavigateOptions,
): Promise<void> {
  return navigateTo(target, { ...options, replace: true })
}

/**
 * 本次会话内是否产生过 SPA 跳转。
 * 两个信号满足其一即可：应用内 push（historyAction === 'PUSH'），
 * 或当前历史记录带上了 react-router 生成的 key（首屏那条固定是 'default'）。
 * 直接打开深链接 / 刷新后两者都不成立，说明没有“上一页”。
 */
let hasInternalHistory = false

router.subscribe((state) => {
  if (state.historyAction === 'PUSH' || state.location.key !== 'default') {
    hasInternalHistory = true
  }
})

/** 返回上一页；没有“上一页”时去 fallback（默认首页），不会把用户带出应用 */
export function goBack(fallback: RouteKey | RoutePath = 'home'): Promise<void> {
  return hasInternalHistory ? router.navigate(-1) : navigateTo(fallback)
}
