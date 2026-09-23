import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import { isPrivateUse, toCssEscape, toUnicodeLabel } from '@/features/font/parseFont'
import { toast, type FontEntry } from '@/store'
import { copyText } from '@/utils/file'
import { toRem } from '@/utils/rem'
import './IconGrid.scss'

const PAGE_SIZE = 300

interface IconGridProps {
  font: FontEntry
  keyword: string
  onlyPrivateUse: boolean
  previewSize: number
}

export function IconGrid({ font, keyword, onlyPrivateUse, previewSize }: IconGridProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(PAGE_SIZE)
  const glyphs = font.parsed?.glyphs

  const filtered = useMemo(() => {
    if (!glyphs) return []
    const needle = keyword.trim().toLowerCase().replace(/^\\/, '')
    return glyphs.filter((glyph) => {
      if (onlyPrivateUse && !isPrivateUse(glyph.codePoint)) return false
      if (!needle) return true
      const hex = glyph.codePoint.toString(16).toLowerCase()
      const padded = hex.padStart(4, '0')
      return (
        hex.includes(needle) ||
        padded.includes(needle) ||
        `u+${padded}`.includes(needle) ||
        (glyph.name?.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [glyphs, keyword, onlyPrivateUse])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [keyword, onlyPrivateUse, font.id])

  if (!glyphs || glyphs.length === 0) {
    return (
      <div className="icon-grid__empty">
        <Icon name="alert" size={26} />
        <p className="icon-grid__empty-text">{t('iconFont.noGlyphs')}</p>
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="icon-grid__empty">
        <Icon name="search" size={26} />
        <p className="icon-grid__empty-text">{t('iconFont.noResult')}</p>
      </div>
    )
  }

  const shown = filtered.slice(0, visible)

  const handleCopy = async (codePoint: number) => {
    const escape = toCssEscape(codePoint)
    const ok = await copyText(escape)
    toast(ok ? `${t('common.copied')}  ${escape}` : t('common.copyFailed'), ok ? 'success' : 'error')
  }

  return (
    <div className="icon-grid">
      <div className="icon-grid__header">
        <span>{t('iconFont.showing', { shown: shown.length, total: filtered.length })}</span>
        <span className="icon-grid__hint">{t('iconFont.hint')}</span>
      </div>

      <div className="icon-grid__cells">
        {shown.map((glyph) => (
          <button
            key={glyph.codePoint}
            type="button"
            onClick={() => void handleCopy(glyph.codePoint)}
            title={`${toUnicodeLabel(glyph.codePoint)}${glyph.name ? `  ${glyph.name}` : ''}`}
            className="icon-grid__cell"
          >
            <span
              className="icon-grid__glyph"
              // 字号是运行时才知道的动态值，构建期换算不了，用 toRem() 换算
              style={{ fontFamily: `'${font.cssFamily}'`, fontSize: toRem(previewSize), lineHeight: 1 }}
            >
              {String.fromCodePoint(glyph.codePoint)}
            </span>
            <span className="icon-grid__code">{glyph.codePoint.toString(16).padStart(4, '0')}</span>
            {glyph.name && <span className="icon-grid__name">{glyph.name}</span>}
          </button>
        ))}
      </div>

      {visible < filtered.length && (
        <div className="icon-grid__more">
          <button type="button" className="btn btn-ghost" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
            {t('iconFont.showing', { shown: shown.length, total: filtered.length })}
          </button>
        </div>
      )}
    </div>
  )
}
