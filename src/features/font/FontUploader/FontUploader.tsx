import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/Icon/Icon'
import './FontUploader.scss'

interface FontUploaderProps {
  onFiles: (files: File[]) => void
  compact?: boolean
}

const ACCEPT = '.woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf'

export function FontUploader({ onFiles, compact = false }: FontUploaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    onFiles(Array.from(fileList))
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn btn-ghost"
        title={t('iconFont.browse')}
      >
        <Icon name="plus" size={16} />
        <span>{t('iconFont.browse')}</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="font-uploader__input"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </button>
    )
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`font-uploader${dragging ? ' font-uploader--dragging' : ''}`}
    >
      <span className="font-uploader__icon">
        <Icon name="upload" size={22} />
      </span>
      <p className="font-uploader__title">{t('iconFont.dropTitle')}</p>
      <p className="font-uploader__hint">{t('iconFont.dropHint')}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="font-uploader__input"
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
