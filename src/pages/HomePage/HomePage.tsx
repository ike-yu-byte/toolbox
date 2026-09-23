import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Icon, type IconName } from '@/components/Icon/Icon'
import { pathOf, type RouteKey } from '@/router/routes'
import './HomePage.scss'

interface ToolCard {
  /** 指向 routes.tsx 登记的路由 key；路径在渲染时解析（顶层读会早于路由常量初始化） */
  key: RouteKey
  icon: IconName
  titleKey: string
  descKey: string
}

const TOOLS: ToolCard[] = [
  { key: 'iconFont', icon: 'font', titleKey: 'home.tools.iconFont.title', descKey: 'home.tools.iconFont.desc' },
  { key: 'jsonFormatter', icon: 'braces', titleKey: 'home.tools.json.title', descKey: 'home.tools.json.desc' },
]

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__glow" />
        <div className="home__hero-inner">
          <span className="home__badge">
            <Icon name="sparkles" size={13} />
            {t('common.localOnly')}
          </span>
          <h1 className="home__title">{t('home.title')}</h1>
          <p className="home__subtitle">{t('home.subtitle')}</p>
        </div>
      </section>

      <div className="home__tools">
        {TOOLS.map((tool) => (
          <Link key={tool.key} to={pathOf(tool.key)} className="home__card">
            <span className="home__card-icon">
              <Icon name={tool.icon} size={20} />
            </span>
            <h2 className="home__card-title">{t(tool.titleKey)}</h2>
            <p className="home__card-desc">{t(tool.descKey)}</p>
            <span className="home__card-more">
              {t('home.openTool')}
              <Icon name="chevron-right" size={15} className="home__card-arrow" />
            </span>
          </Link>
        ))}
      </div>

      <p className="home__footer">{t('home.comingSoon')}</p>
    </div>
  )
}
