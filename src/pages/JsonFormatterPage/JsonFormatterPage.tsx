import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { JsonTree } from '@/features/json/JsonTree/JsonTree'
import {
  analyzeJson,
  parseJson,
  sortJsonValue,
  stringifyJson,
  type JsonIndent,
  type JsonRootType,
} from '@/features/json/jsonUtils'
import { toast, useAppStore } from '@/store'
import { copyText, downloadText } from '@/utils/file'
import './JsonFormatterPage.scss'

const SAMPLE = {
  name: 'dev-toolbox',
  version: '1.0.0',
  private: true,
  tags: ['react', 'vite', 'typescript'],
  scripts: { dev: 'vite', build: 'tsc && vite build' },
  nested: { level1: { level2: { level3: [1, 2, 3] } } },
  enabled: true,
  extra: null,
}

const TREE_NODE_LIMIT = 5000

export function JsonFormatterPage() {
  const { t } = useTranslation()
  const json = useAppStore((state) => state.json)
  const updateJson = useAppStore((state) => state.updateJson)
  const fileRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => (json.input.trim() ? parseJson(json.input) : null), [json.input])

  const normalizedValue = useMemo(
    () => (parsed?.ok ? (json.sortKeys ? sortJsonValue(parsed.value) : parsed.value) : undefined),
    [parsed, json.sortKeys],
  )

  const textOutput = useMemo(
    () =>
      parsed?.ok ? stringifyJson(normalizedValue, json.indent, json.mode === 'minify') : '',
    [parsed, normalizedValue, json.indent, json.mode],
  )

  const stats = useMemo(
    () => (parsed?.ok ? analyzeJson(parsed.value, json.input) : null),
    [parsed, json.input],
  )

  const errorText = useMemo(() => {
    if (!parsed || parsed.ok) return ''
    return parsed.error.line
      ? t('json.errorAt', { line: parsed.error.line, column: parsed.error.column })
      : t('json.errorNoPosition')
  }, [parsed, t])

  const handleValidate = () => {
    if (!json.input.trim()) {
      toast(t('json.emptyInput'), 'info')
      return
    }
    if (parsed?.ok) {
      toast(t('json.parseOk'), 'success')
    } else {
      toast(`${t('json.parseError')} ${errorText}`, 'error')
    }
  }

  const handleCopy = async () => {
    if (!textOutput) {
      toast(t('json.emptyInput'), 'info')
      return
    }
    const ok = await copyText(textOutput)
    toast(ok ? t('common.copied') : t('common.copyFailed'), ok ? 'success' : 'error')
  }

  const handleDownload = () => {
    if (!textOutput) {
      toast(t('json.emptyInput'), 'info')
      return
    }
    const fileName = 'data.json'
    downloadText(textOutput, fileName, 'application/json;charset=utf-8')
    toast(t('json.downloadSuccess', { name: fileName }))
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    updateJson({ input: text })
  }

  const indentValue = json.indent === 'tab' ? 'tab' : String(json.indent)

  return (
    <div className="json-page">
      <PageHeader title={t('json.title')} subtitle={t('json.subtitle')}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => updateJson({ input: JSON.stringify(SAMPLE, null, 2) })}
        >
          <Icon name="sparkles" size={16} />
          {t('json.loadSample')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} />
          {t('json.uploadFile')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json"
          className="json-page__file"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </PageHeader>

      <div className="json-page__grid">
        {/* 输入 */}
        <section className="json-page__panel">
          <div className="json-page__head">
            <span className="json-page__head-title">{t('json.input')}</span>

            <div className="json-page__segment">
              <button
                type="button"
                onClick={() => updateJson({ mode: 'pretty' })}
                className={`json-page__segment-btn${
                  json.mode === 'pretty' ? ' json-page__segment-btn--active' : ''
                }`}
              >
                {t('json.format')}
              </button>
              <button
                type="button"
                onClick={() => updateJson({ mode: 'minify' })}
                className={`json-page__segment-btn${
                  json.mode === 'minify' ? ' json-page__segment-btn--active' : ''
                }`}
              >
                {t('json.minify')}
              </button>
            </div>

            <select
              value={indentValue}
              disabled={json.mode === 'minify'}
              onChange={(event) =>
                updateJson({
                  indent: (event.target.value === 'tab' ? 'tab' : Number(event.target.value)) as JsonIndent,
                })
              }
              className="json-page__select"
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="tab">Tab</option>
            </select>

            <button
              type="button"
              onClick={() => updateJson({ sortKeys: !json.sortKeys })}
              className={`json-page__sort${json.sortKeys ? ' json-page__sort--active' : ''}`}
            >
              <Icon name="list" size={13} />
              {t('json.sortKeys')}
            </button>
          </div>

          <textarea
            value={json.input}
            spellCheck={false}
            onChange={(event) => updateJson({ input: event.target.value })}
            placeholder={t('json.inputPlaceholder')}
            className="json-page__editor"
          />

          <div className="json-page__foot">
            <button type="button" className="btn btn-ghost" onClick={handleValidate}>
              <Icon name="check" size={15} />
              {t('json.validate')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => updateJson({ input: '' })}
              disabled={!json.input}
            >
              <Icon name="trash" size={15} />
              {t('common.clear')}
            </button>
          </div>
        </section>

        {/* 输出 */}
        <section className="json-page__panel">
          <div className="json-page__head">
            <span className="json-page__head-title">{t('json.output')}</span>

            <div className="json-page__segment">
              <button
                type="button"
                onClick={() => updateJson({ view: 'text' })}
                className={`json-page__segment-btn${
                  json.view === 'text' ? ' json-page__segment-btn--active' : ''
                }`}
              >
                {t('json.viewText')}
              </button>
              <button
                type="button"
                onClick={() => updateJson({ view: 'tree' })}
                className={`json-page__segment-btn${
                  json.view === 'tree' ? ' json-page__segment-btn--active' : ''
                }`}
              >
                {t('json.viewTree')}
              </button>
            </div>

            <button type="button" className="btn btn-ghost" onClick={() => void handleCopy()}>
              <Icon name="copy" size={15} />
              {t('json.copyResult')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleDownload}>
              <Icon name="download" size={15} />
              {t('json.downloadFile')}
            </button>
          </div>

          <div className="json-page__body">
            {!json.input.trim() && (
              <p className="json-page__placeholder">{t('json.outputPlaceholder')}</p>
            )}

            {parsed && !parsed.ok && (
              <div className="json-page__error">
                <Icon name="alert" size={15} className="json-page__error-icon" />
                <div className="json-page__error-body">
                  <p className="json-page__error-title">{t('json.parseError')}</p>
                  <p className="json-page__error-message">{parsed.error.message}</p>
                  <p className="json-page__error-title">{errorText}</p>
                </div>
              </div>
            )}

            {parsed?.ok && json.view === 'text' && (
              <pre className="json-page__output">{textOutput}</pre>
            )}

            {parsed?.ok && json.view === 'tree' && (
              <div className="json-page__tree">
                {stats && stats.nodes > TREE_NODE_LIMIT ? (
                  <p className="json-page__too-large">
                    {stats.nodes} nodes · {t('json.viewText')}
                  </p>
                ) : (
                  <JsonTree value={normalizedValue} />
                )}
              </div>
            )}
          </div>

          {stats && (
            <div className="json-page__stats">
              <span className="chip">
                {t('json.stats.type')}: {t(`json.types.${stats.rootType as JsonRootType}`)}
              </span>
              <span className="chip">
                {t('json.stats.chars')}: {stats.chars}
              </span>
              <span className="chip">
                {t('json.stats.lines')}: {stats.lines}
              </span>
              <span className="chip">
                {t('json.stats.keys')}: {stats.keys}
              </span>
              <span className="chip">
                {t('json.stats.nodes')}: {stats.nodes}
              </span>
              <span className="chip">
                {t('json.stats.depth')}: {stats.depth}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
