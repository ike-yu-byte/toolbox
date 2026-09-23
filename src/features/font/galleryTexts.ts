import type { GalleryTexts } from '@/features/font/exportHtml'
import i18n from '@/locales/i18n'

/**
 * 导出 HTML 时的界面文案（跟随当前语言）。
 * 放在 feature 内，让 locales 只负责 i18n 本身，不需要了解任何业务模板。
 */
export function getGalleryTexts(): GalleryTexts {
  return {
    title: i18n.t('iconFont.exportedTitle'),
    total: i18n.t('iconFont.exportedSubtitle'),
    search: i18n.t('iconFont.searchPlaceholder'),
    copyHint: i18n.t('iconFont.hint'),
    copied: i18n.t('common.copied'),
    noResult: i18n.t('iconFont.noResult'),
    usage: i18n.t('iconFont.usage'),
    cssClass: i18n.t('iconFont.copyCss'),
    file: i18n.t('iconFont.file'),
    format: i18n.t('iconFont.format'),
    size: i18n.t('iconFont.fileSize'),
    glyphs: i18n.t('iconFont.glyphs'),
    privateUse: i18n.t('iconFont.privateUse'),
    all: i18n.t('iconFont.all'),
  }
}
