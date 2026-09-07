'use client'

import React, { useRef, useState } from 'react'
import {
  IconAlertTriangle,
  IconCheck,
  IconCloudUpload,
  IconFile,
  IconLoader2,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'

function bytesToLabel(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusInfo(status) {
  if (['processado', 'success', 'ready'].includes(status)) return { label: 'Pronto', tone: 'success', icon: IconCheck }
  if (['erro', 'error', 'failed'].includes(status)) return { label: 'Erro', tone: 'error', icon: IconAlertTriangle }
  if (['processando', 'uploading', 'processing'].includes(status)) return { label: 'Processando', tone: 'processing', icon: IconLoader2 }
  return { label: 'Na fila', tone: 'pending', icon: IconFile }
}

export default function FileUploadPanel({
  items = [],
  onFilesAdded,
  onFileRemove,
  onRetry,
  maxFiles = 10,
  maxSizeMB = 50,
  accept = '.pdf',
  multiple = true,
  helper = 'Arraste os arquivos ou clique para selecionar.',
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [validationError, setValidationError] = useState('')

  function selectFiles(list) {
    const selected = Array.from(list || [])
    const remaining = Math.max(0, maxFiles - items.length)
    const withinCount = selected.slice(0, remaining)
    const maxBytes = maxSizeMB * 1024 * 1024
    const allowed = withinCount.filter((file) => file.size <= maxBytes)

    if (selected.length > remaining) setValidationError(`Você pode adicionar no máximo ${maxFiles} arquivos.`)
    else if (allowed.length !== withinCount.length) setValidationError(`Cada arquivo pode ter até ${maxSizeMB} MB.`)
    else setValidationError('')

    if (allowed.length) onFilesAdded?.(allowed)
  }

  return (
    <div className="file-upload-panel">
      <button
        type="button"
        className={`file-upload-dropzone ${dragging ? 'is-dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          selectFiles(event.dataTransfer.files)
        }}
      >
        <span className="file-upload-icon"><IconCloudUpload size={25} /></span>
        <strong>Adicionar arquivos</strong>
        <span>{helper}</span>
        <small>Até {maxFiles} arquivos · {maxSizeMB} MB por arquivo</small>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          selectFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {validationError && <div className="file-upload-error"><IconAlertTriangle size={16} /> {validationError}</div>}

      {items.length > 0 && (
        <div className="file-upload-list">
          <div className="file-upload-list-head">
            <span>{items.length} arquivo{items.length > 1 ? 's' : ''}</span>
            <button type="button" onClick={() => inputRef.current?.click()}><IconPlus size={15} /> Adicionar mais</button>
          </div>
          {items.map((item, index) => {
            const info = statusInfo(item.status)
            const StatusIcon = info.icon
            const file = item.file || item
            const name = item.name || file?.name || `Arquivo ${index + 1}`
            const size = file?.size || item.size || 0
            return (
              <div className={`file-upload-item ${info.tone}`} key={item.id || `${name}-${index}`}>
                <span className="file-upload-file-icon"><IconFile size={18} /></span>
                <div className="file-upload-copy">
                  <strong title={name}>{name}</strong>
                  <small>{size ? bytesToLabel(size) : ''}{item.count ? ` · ${item.count} itens` : ''}</small>
                  {info.tone === 'processing' && <span className="file-upload-progress indeterminate"><i /></span>}
                  {info.tone === 'success' && <span className="file-upload-progress complete"><i /></span>}
                  {item.error && <em>{item.error}</em>}
                </div>
                <div className="file-upload-status">
                  <span><StatusIcon size={16} className={info.tone === 'processing' ? 'spin' : ''} /> {info.label}</span>
                  {info.tone === 'error' && onRetry && <button type="button" onClick={() => onRetry(item.id)}>Tentar novamente</button>}
                  {onFileRemove && <button type="button" className="icon-btn" aria-label={`Remover ${name}`} onClick={() => onFileRemove(item.id ?? index)}><IconTrash size={16} /></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
