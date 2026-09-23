import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import type { FontEntry } from '@/store'
import { formatBytes } from '@/utils/file'
import './FontList.scss'

interface FontListProps {
  fonts: FontEntry[]
  activeId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

const UNKNOWN_PREFIX = 'UNKNOWN:'

export function FontList({ fonts, activeId, onSelect, onRemove }: FontListProps) {
  const { t } = useTranslation()

  return (
    <div className="font-list">
      {fonts.map((font) => {
        const active = font.id === activeId
        return (
          <div
            key={font.id}
            onClick={() => onSelect(font.id)}
            className={`font-list__item${active ? ' font-list__item--active' : ''}`}
          >
            <div className="font-list__inner">
              <span
                className={`font-list__icon${
                  font.status === 'error' ? ' font-list__icon--error' : ''
                }`}
              >
                <Icon name={font.status === 'error' ? 'alert' : 'font'} size={16} />
              </span>

              <div className="font-list__body">
                <p className="font-list__name">{font.parsed?.familyName ?? font.fileName}</p>
                <p className="font-list__meta">
                  {font.fileName} · {formatBytes(font.size)}
                </p>

                {font.status === 'loading' && (
                  <p className="font-list__status font-list__status--loading">{t('common.loading')}</p>
                )}

                {font.status === 'ready' && font.parsed && (
                  <div className="font-list__chips">
                    <span className="chip">{font.parsed.format}</span>
                    <span className="chip">
                      {font.parsed.glyphs.length} {t('iconFont.icons')}
                    </span>
                  </div>
                )}

                {font.status === 'error' && (
                  <p className="font-list__status font-list__status--error">
                    {t('iconFont.parseFailed')}：
                    {font.error?.startsWith(UNKNOWN_PREFIX)
                      ? t('iconFont.errors.UNKNOWN', { message: font.error.slice(UNKNOWN_PREFIX.length) })
                      : t(`iconFont.errors.${font.error}`)}
                  </p>
                )}
              </div>

              <button
                type="button"
                title={t('iconFont.removeFont')}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(font.id)
                }}
                className="font-list__remove"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
