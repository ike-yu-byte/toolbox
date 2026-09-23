import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import { goBack } from '@/router'
import { ROUTES } from '@/router/routes'
import './NotFoundPage.scss'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="not-found">
      <span className="not-found__icon">
        <Icon name="search" size={24} />
      </span>
      <h1 className="not-found__title">{t('notFound.title')}</h1>
      <p className="not-found__desc">{t('notFound.desc')}</p>

      <div className="not-found__actions">
        {/* 组件内跳转用 <Link>，保留 a 标签语义（可中键新窗口打开） */}
        <Link to={ROUTES.home} className="btn btn-primary">
          <Icon name="home" size={16} />
          {t('notFound.backHome')}
        </Link>
        {/* 需要带逻辑的跳转用编程式 API，不必套一层 JSX */}
        <button type="button" className="btn btn-ghost" onClick={() => void goBack()}>
          <Icon name="chevron-right" size={16} className="not-found__back-icon" />
          {t('notFound.backPrev')}
        </button>
      </div>
    </div>
  )
}
