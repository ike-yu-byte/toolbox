import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@/locales/locale'
import { APP_ROUTES } from '@/router/routes'
import { useAppStore } from '@/store'
import './Sidebar.scss'

export function Sidebar() {
  const { t } = useTranslation()
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const theme = useAppStore((state) => state.theme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo">
          <Icon name="sparkles" size={18} />
        </span>
        {!collapsed && (
          <span className="sidebar__meta">
            <span className="sidebar__name">{t('common.appName')}</span>
            <span className="sidebar__tagline">{t('common.tagline')}</span>
          </span>
        )}
      </div>

      <nav className="sidebar__nav">
        {APP_ROUTES.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.key === 'home'}
            title={collapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            {!collapsed && <span className="sidebar__link-text">{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {!collapsed && (
          <div className="sidebar__segment">
            {SUPPORTED_LOCALES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={`sidebar__segment-btn${
                  locale === item ? ' sidebar__segment-btn--active' : ''
                }`}
              >
                {LOCALE_LABELS[item]}
              </button>
            ))}
          </div>
        )}

        <div className="sidebar__actions">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('common.light') : t('common.dark')}
            className="sidebar__action"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            {!collapsed && <span>{theme === 'dark' ? t('common.light') : t('common.dark')}</span>}
          </button>

          {collapsed && (
            <button
              type="button"
              onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
              title={t('common.language')}
              className="sidebar__action"
            >
              <Icon name="globe" size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          title={t('common.collapse')}
          className="sidebar__action sidebar__action--block"
        >
          <Icon name="panel" size={16} />
          {!collapsed && <span>{t('common.collapse')}</span>}
        </button>
      </div>
    </aside>
  )
}
