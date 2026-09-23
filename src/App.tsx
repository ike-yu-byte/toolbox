import { RouterProvider } from 'react-router/dom'
import { IconSprite } from '@/components/IconSprite/IconSprite'
import { router } from '@/router'

/**
 * 应用根组件：路由表在 src/router/routes.tsx 集中维护，这里只负责
 * 挂一次 SVG 精灵图（图标 symbol 容器）与路由实例。
 */
export function App() {
  return (
    <>
      <IconSprite />
      <RouterProvider router={router} />
    </>
  )
}
