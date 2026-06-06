'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import {
  deleteProjectFile,
  listProjectFiles,
  uploadProjectFile,
} from '@/app/actions/project-attachments'
import { formatFileSize } from '@/lib/ops/projects/files-display'
import type { OpsProjectFile } from '@/lib/ops/projects/types'
import { formatDateTimeHuman } from '@/lib/tickets/display'
import { runWithToast } from '@/lib/notify'

export function ProjectFilePanel({
  projectId,
  taskId = null,
  title,
  emptyLabel,
  showTaskLabel = false,
  embedded = false,
  compactUpload = false,
  hideEmpty = false,
  hideLoading = false,
  onCountChange,
}: {
  projectId: string
  taskId?: string | null
  title: string
  emptyLabel: string
  showTaskLabel?: boolean
  embedded?: boolean
  compactUpload?: boolean
  hideEmpty?: boolean
  hideLoading?: boolean
  onCountChange?: (count: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<OpsProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  const scope = taskId ? 'task' : 'project'

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listProjectFiles(projectId, scope, taskId ?? undefined)
      setFiles(rows)
      onCountChange?.(rows.length)
    } finally {
      setLoading(false)
    }
  }, [projectId, scope, taskId, onCountChange])

  useEffect(() => {
    void loadFiles()
  }, [loadFiles])

  function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return
    const file = fileList[0]
    const formData = new FormData()
    formData.set('projectId', projectId)
    if (taskId) formData.set('taskId', taskId)
    formData.set('file', file)

    startTransition(async () => {
      const ok = await runWithToast(() => uploadProjectFile(formData), {
        loading: 'Uploading…',
        success: 'File uploaded',
      })
      if (ok === null) return
      if (inputRef.current) inputRef.current.value = ''
      await loadFiles()
    })
  }

  function handleDelete(fileId: string) {
    startTransition(async () => {
      const ok = await runWithToast(() => deleteProjectFile(fileId), {
        loading: 'Removing file…',
        success: 'File removed',
      })
      if (ok === null) return
      await loadFiles()
    })
  }

  const uploadControl = (
    <label className="ops-project-files-upload">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={pending}
        onChange={e => handleUpload(e.target.files)}
      />
      <Upload size={14} aria-hidden />
      <span>{pending ? 'Uploading…' : 'Upload file'}</span>
    </label>
  )

  return (
    <section
      className={`ops-project-files${embedded ? ' ops-project-files--embedded' : ''}${compactUpload ? ' ops-project-files--compact-upload' : ''}`}
    >
      {embedded ? (
        compactUpload ? (
          <div className="ops-project-files-compact-row">{uploadControl}</div>
        ) : (
          <div className="ops-project-files-embedded-head">{uploadControl}</div>
        )
      ) : (
        <div className="ops-project-files-head">
          <h3 className="ops-project-files-title">{title}</h3>
          {uploadControl}
        </div>
      )}

      {loading ? (
        hideLoading ? null : <p className="ops-project-files-empty">Loading files…</p>
      ) : files.length === 0 ? (
        hideEmpty ? null : <p className="ops-project-files-empty">{emptyLabel}</p>
      ) : (
        <ul className="ops-project-files-list">
          {files.map(file => (
            <li key={file.id} className="ops-project-files-item">
              <a
                href={`/api/ops/projects/files/${file.id}`}
                className="ops-project-files-link"
                download={file.fileName}
              >
                <FileText size={15} aria-hidden />
                <span className="ops-project-files-name">{file.fileName}</span>
              </a>
              <div className="ops-project-files-meta">
                <span className="tabular-nums">{formatFileSize(file.sizeBytes)}</span>
                {showTaskLabel && file.taskTitle ? (
                  <span className="ops-project-files-task">{file.taskTitle}</span>
                ) : null}
                {file.uploadedByName ? <span>{file.uploadedByName}</span> : null}
                <time dateTime={file.createdAt}>{formatDateTimeHuman(file.createdAt)}</time>
              </div>
              <button
                type="button"
                className="ops-project-files-delete"
                aria-label={`Delete ${file.fileName}`}
                disabled={pending}
                onClick={() => handleDelete(file.id)}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
