import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { Toaster } from '@/components/Toaster/Toaster'
import { APP_ROUTES } from '@/router/routes'
import { useAppStore } from '@/store'
import './AppLayout.scss'

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)

  // 跟随路由与语言更新浏览器标题
  useEffect(() => {
    const active = APP_ROUTES.find((item) => item.path === location.pathname)
    document.title = active
      ? `${t(active.labelKey)} · ${t('common.appName')}`
      : `${t('common.appName')} · ${t('common.tagline')}`
  }, [location.pathname, t, i18n.language])

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-layout__body">
        {/* 移动端顶部导航（桌面端由侧边栏承担） */}
        <header className="app-layout__topbar">
          <span className="app-layout__brand">
            <Icon name="sparkles" size={16} />
          </span>
          <nav className="app-layout__topnav">
            {APP_ROUTES.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.key === 'home'}
                className={({ isActive }) =>
                  `app-layout__toplink${isActive ? ' app-layout__toplink--active' : ''}`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
          <button type="button" onClick={toggleTheme} className="app-layout__theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
        </header>

        <main className="app-layout__main">
          <div className="app-layout__container">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  )
}
