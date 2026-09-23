import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { FontList } from '@/features/font/FontList/FontList'
import { FontUploader } from '@/features/font/FontUploader/FontUploader'
import { IconGrid } from '@/features/font/IconGrid/IconGrid'
import {
  buildIconGalleryHtml,
  buildCssClassList,
  type ExportFontInput,
} from '@/features/font/exportHtml'
import { getGalleryTexts } from '@/features/font/galleryTexts'
import { isPrivateUse } from '@/features/font/parseFont'
import { toast, useAppStore, useFontLibrary, type FontEntry } from '@/store'
import { copyText, downloadText, formatBytes } from '@/utils/file'
import './IconFontPage.scss'

const CSS_PREVIEW_LINES = 400

function toExportInputs(fonts: FontEntry[]): ExportFontInput[] {
  return fonts.flatMap((item) =>
    item.status === 'ready' && item.parsed
      ? [{ fileName: item.fileName, font: item.parsed, bytes: item.bytes }]
      : [],
  )
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || 'icon-font'
}

export function IconFontPage() {
  const { t } = useTranslation()
  const fonts = useFontLibrary((state) => state.fonts)
  const activeId = useFontLibrary((state) => state.activeId)
  const addFiles = useFontLibrary((state) => state.addFiles)
  const removeFont = useFontLibrary((state) => state.removeFont)
  const clearAll = useFontLibrary((state) => state.clearAll)
  const setActive = useFontLibrary((state) => state.setActive)

  const keyword = useAppStore((state) => state.font.keyword)
  const onlyPrivateUse = useAppStore((state) => state.font.onlyPrivateUse)
  const previewSize = useAppStore((state) => state.font.previewSize)
  const updateFont = useAppStore((state) => state.updateFont)

  const activeFont = useMemo(
    () => fonts.find((item) => item.id === activeId) ?? fonts[0],
    [fonts, activeId],
  )

  const privateUseCount = useMemo(
    () => activeFont?.parsed?.glyphs.filter((glyph) => isPrivateUse(glyph.codePoint)).length ?? 0,
    [activeFont],
  )

  const cssClasses = useMemo(
    () => (activeFont?.parsed ? buildCssClassList(activeFont.parsed) : ''),
    [activeFont],
  )

  const handleExport = (targets: FontEntry[]) => {
    const inputs = toExportInputs(targets)
    if (inputs.length === 0) {
      toast(t('iconFont.exportEmpty'), 'info')
      return
    }
    const html = buildIconGalleryHtml(inputs, getGalleryTexts(), new Date().toLocaleString())
    const fileName =
      inputs.length === 1
        ? `${sanitizeFileName(inputs[0].font.familyName)}-icons.html`
        : `icon-font-gallery-${inputs.length}.html`
    downloadText(html, fileName, 'text/html;charset=utf-8')
    toast(t('iconFont.exportSuccess', { name: fileName }))
  }

  const handleCopyCss = async () => {
    if (!cssClasses) return
    const ok = await copyText(cssClasses)
    toast(ok ? t('common.copied') : t('common.copyFailed'), ok ? 'success' : 'error')
  }

  return (
    <div className="font-page">
      <PageHeader title={t('iconFont.title')} subtitle={t('iconFont.subtitle')}>
        {fonts.length > 0 && (
          <>
            <FontUploader compact onFiles={(files) => void addFiles(files)} />
            <button type="button" className="btn btn-ghost" onClick={() => handleExport(fonts)}>
              <Icon name="download" size={16} />
              {t('iconFont.exportAll')}
            </button>
            <button type="button" className="btn btn-danger" onClick={clearAll}>
              <Icon name="trash" size={16} />
              {t('iconFont.clearAll')}
            </button>
          </>
        )}
      </PageHeader>

      {fonts.length === 0 ? (
        <FontUploader onFiles={(files) => void addFiles(files)} />
      ) : (
        <div className="font-page__layout">
          <div className="font-page__aside">
            <FontList
              fonts={fonts}
              activeId={activeFont?.id ?? null}
              onSelect={setActive}
              onRemove={removeFont}
            />
          </div>

          <div className="font-page__panel surface">
            {activeFont?.status === 'loading' && (
              <p className="font-page__state">{t('common.loading')}</p>
            )}

            {activeFont?.status === 'error' && (
              <div className="font-page__error">
                <Icon name="alert" size={26} className="font-page__error-icon" />
                <p className="font-page__error-title">{t('iconFont.parseFailed')}</p>
                <p className="font-page__error-text">
                  {activeFont.error?.startsWith('UNKNOWN:')
                    ? t('iconFont.errors.UNKNOWN', {
                        message: activeFont.error.slice('UNKNOWN:'.length),
                      })
                    : t(`iconFont.errors.${activeFont.error}`)}
                </p>
                <p className="font-page__error-text">{t('iconFont.parseFailedHint')}</p>
              </div>
            )}

            {activeFont?.status === 'ready' && activeFont.parsed && (
              <>
                <div className="font-page__head">
                  <div className="font-page__head-text">
                    <h2 className="font-page__font-name">{activeFont.parsed.familyName}</h2>
                    <div className="font-page__chips">
                      <span className="chip">{activeFont.fileName}</span>
                      <span className="chip">{formatBytes(activeFont.size)}</span>
                      <span className="chip">
                        {t('iconFont.glyphs')}: {activeFont.parsed.numGlyphs}
                      </span>
                      <span className="chip">
                        {t('iconFont.icons')}: {activeFont.parsed.glyphs.length}
                      </span>
                      <span className="chip">
                        {t('iconFont.privateUse')}: {privateUseCount}
                      </span>
                      {activeFont.parsed.unitsPerEm && (
                        <span className="chip">
                          {t('iconFont.unitsPerEm')}: {activeFont.parsed.unitsPerEm}
                        </span>
                      )}
                      {activeFont.parsed.version && (
                        <span className="chip">
                          {t('iconFont.version')}: {activeFont.parsed.version}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-page__head-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => void handleCopyCss()}>
                      <Icon name="copy" size={15} />
                      {t('iconFont.copyCss')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleExport([activeFont])}
                    >
                      <Icon name="download" size={15} />
                      {t('iconFont.exportHtml')}
                    </button>
                  </div>
                </div>

                <div className="divider font-page__divider" />

                <div className="font-page__toolbar">
                  <div className="font-page__search">
                    <Icon name="search" size={15} className="font-page__search-icon" />
                    <input
                      className="input font-page__search-input"
                      value={keyword}
                      placeholder={t('iconFont.searchPlaceholder')}
                      onChange={(event) => updateFont({ keyword: event.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className={`btn ${onlyPrivateUse ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => updateFont({ onlyPrivateUse: !onlyPrivateUse })}
                  >
                    <Icon name="grid" size={15} />
                    {t('iconFont.onlyPrivateUse')}
                  </button>
                  <label className="font-page__size">
                    {t('iconFont.previewSize')}
                    <input
                      type="range"
                      min={16}
                      max={56}
                      step={2}
                      value={previewSize}
                      onChange={(event) => updateFont({ previewSize: Number(event.target.value) })}
                      className="font-page__range"
                    />
                    <span className="font-page__size-value">{previewSize}</span>
                  </label>
                </div>

                <IconGrid
                  font={activeFont}
                  keyword={keyword}
                  onlyPrivateUse={onlyPrivateUse}
                  previewSize={previewSize}
                />

                {cssClasses && (
                  <details className="font-page__usage">
                    <summary className="font-page__usage-summary">
                      <span>{t('iconFont.usage')}</span>
                      <span className="font-page__usage-count">
                        {activeFont.parsed.glyphs.length} classes
                      </span>
                    </summary>
                    <div className="font-page__usage-body">
                      <pre className="font-page__usage-pre scroll-y">
                        {cssClasses.split('\n').slice(0, CSS_PREVIEW_LINES).join('\n')}
                      </pre>
                      <div className="font-page__usage-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => void handleCopyCss()}>
                          <Icon name="copy" size={15} />
                          {t('common.copy')}
                        </button>
                      </div>
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
