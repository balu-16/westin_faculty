import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  FolderOpen,
  MoreVertical,
  Pencil,
  Presentation,
  Search,
  Sheet,
  Trash2,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Header } from '../../components/Header'
import { StatCard } from '../../components/StatCard'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { FileField, SelectField, TextAreaField, TextField } from '../../components/FormFields'
import { SkeletonCards, SkeletonRows, Spinner } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { apiFetch, uploadBytes, useApi, type SessionKey } from '../../lib/api'
import { type ApiSubject } from '../../lib/mappers'
import type { FileType, StudyFile, SubjectFolder } from '../../types'
import { cx, displayDate, fileTypeMeta, formatBytes, guessFileType } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const typeIcons: Record<FileType, LucideIcon> = {
  pdf: FileText,
  docx: FileText,
  pptx: Presentation,
  xlsx: Sheet,
}

function FileTypeBadge({ type }: { type: FileType }) {
  const Icon = typeIcons[type]
  const meta = fileTypeMeta[type]
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: meta.bg, color: meta.color }}
      aria-label={`${meta.label} file`}
    >
      <Icon size={20} aria-hidden="true" />
    </span>
  )
}

interface RowActionsProps {
  file: StudyFile
  /** Row-level delete in flight — spinner + disabled icon button. */
  deleting?: boolean
  onDownload: (_file: StudyFile) => void
  onDelete: (_file: StudyFile) => void
}

function RowActions({ file, deleting = false, onDownload, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onDownload(file)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary-dark transition-colors duration-200 hover:bg-primary hover:text-white"
      >
        <Download size={13} aria-hidden="true" />
        Download
      </button>
      <button
        type="button"
        aria-label={`Edit ${file.name}`}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors duration-200 hover:bg-primary-light hover:text-primary-dark"
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(file)}
        aria-label={`Delete ${file.name}`}
        disabled={deleting}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors duration-200 hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-60"
      >
        {deleting ? <Spinner size={14} className="text-danger" /> : <Trash2 size={14} aria-hidden="true" />}
      </button>
      <button
        type="button"
        aria-label="More actions"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors duration-200 hover:bg-primary-light hover:text-primary-dark"
      >
        <MoreVertical size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

interface ApiMaterial {
  id: string
  name: string
  description: string | null
  type: FileType
  subject: string | null
  subjectId: string | null
  uploadedBy: string
  date: string
  size: number
  downloadUrl: string | null
}

interface MaterialsPayload {
  files: ApiMaterial[]
  folders: Array<{ id: string; name: string; fileCount: number }>
  stats: { totalFiles: number; totalSize: number; subjects: number }
}

function mapMaterial(raw: ApiMaterial): StudyFile {
  return {
    id: raw.id,
    name: raw.name,
    subtitle: raw.description || raw.name,
    type: raw.type,
    subject: raw.subject ?? 'General',
    uploadedBy: raw.uploadedBy,
    date: displayDate(raw.date),
    size: formatBytes(raw.size),
    downloadUrl: raw.downloadUrl,
    sizeBytes: raw.size,
    description: raw.description,
    subjectId: raw.subjectId,
  }
}

const isRecent = (file: StudyFile) => {
  const then = new Date(`${file.date}`).getTime()
  return Number.isFinite(then) && Date.now() - then <= 7 * 24 * 60 * 60 * 1000
}

interface ManageMaterialsProps {
  headerSubtitle: string
  /** Which portal session's tokens are attached to the API calls */
  sessionKey: SessionKey
}

/** Study materials manager shared by the faculty and admin portals. */
export function ManageMaterials({ headerSubtitle, sessionKey }: ManageMaterialsProps) {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('latest')
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)
  const PAGE_SIZE = 20
  const foldersRef = useRef<HTMLDivElement | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ file?: string; title?: string; subject?: string }>({})

  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300)
    return () => window.clearTimeout(t)
  }, [query])

  const materialsPath = (() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (subjectFilter) params.set('subjectId', subjectFilter)
    if (sort && sort !== 'latest') params.set('sort', sort)
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    const qs = params.toString()
    return `/api/materials${qs ? `?${qs}` : ''}`
  })()

  const { data, error, loading, reload } = useApi<MaterialsPayload>(sessionKey, materialsPath, [materialsPath])
  const {
    data: subjects,
    error: subjectsError,
    reload: reloadSubjects,
  } = useApi<ApiSubject[]>(sessionKey, '/api/subjects')

  const files = useMemo(() => (data?.files ?? []).map(mapMaterial), [data])
  const folders: SubjectFolder[] = useMemo(
    () => (data?.folders ?? []).map((f) => ({ id: f.id, subject: f.name, fileCount: f.fileCount })),
    [data],
  )

  const initialLoading = loading && !data

  const filteredFiles = files

  const handleDownload = (file: StudyFile) => {
    if (file.downloadUrl) window.open(file.downloadUrl, '_blank', 'noopener')
    else toast.danger('Download link is no longer valid — reload the page.')
  }

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!uploadFile) nextErrors.file = 'Choose a file to upload.'
    if (!title.trim()) nextErrors.title = 'Title is required.'
    if (!subject) nextErrors.subject = 'Select a subject.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !uploadFile) return

    setUploading(true)
    try {
      // Step 1 — signed upload URL; Step 2 — PUT the bytes; Step 3 — register
      // the uploaded object as a study file row.
      const { path, url } = await apiFetch<{ path: string; url: string }>(
        '/api/materials/upload-url',
        {
          method: 'POST',
          sessionKey,
          body: {
            name: uploadFile.name,
            contentType: uploadFile.type || 'application/octet-stream',
            sizeBytes: uploadFile.size,
          },
        },
      )
      await uploadBytes(url, uploadFile, uploadFile.type || 'application/octet-stream')
      await apiFetch('/api/materials', {
        method: 'POST',
        sessionKey,
        body: {
          name: title.trim() || uploadFile.name,
          subjectId: subject,
          fileType: guessFileType(uploadFile.name),
          sizeBytes: uploadFile.size,
          storagePath: path,
          description: description.trim() || undefined,
        },
      })
      toast.success(`"${uploadFile.name}" uploaded — students can download it now.`)
      setModalOpen(false)
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (file: StudyFile) => {
    setDeletingId(file.id)
    try {
      await apiFetch(`/api/materials/${file.id}`, { method: 'DELETE', sessionKey })
      toast.danger(`"${file.name}" was deleted.`)
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not delete the file.')
    } finally {
      setDeletingId(null)
    }
  }

  const openUpload = () => {
    setUploadFile(null)
    setTitle('')
    setSubject('')
    setDescription('')
    setErrors({})
    setModalOpen(true)
  }

  const scrollFolders = (direction: 1 | -1) => {
    foldersRef.current?.scrollBy({ left: direction * 260, behavior: 'smooth' })
  }

  const stats = data?.stats

  return (
    <div className="space-y-6">
      <Header
        title="Study Materials"
        subtitle={headerSubtitle}
        onMenuClick={openMenu}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/70"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search materials..."
                aria-label="Search materials"
                className="h-10 w-44 rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors duration-200 focus:border-primary focus:outline-none sm:w-56"
              />
            </div>
            <button
              type="button"
              aria-label="Filter materials"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary"
            >
              <Filter size={16} aria-hidden="true" />
            </button>
            <Button onClick={openUpload}>
              <Upload size={16} aria-hidden="true" />
              Upload Material
            </Button>
          </div>
        }
      />

      {/* Statistics */}
      {initialLoading ? (
        <SkeletonCards count={4} />
      ) : error && !data ? null : (
      <section aria-label="Material statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FolderOpen} title="Total Folders" value={String(stats?.subjects ?? folders.length)} footnote="Organized by Subject" />
        <StatCard
          icon={FileText}
          title="Total Files"
          value={String(stats?.totalFiles ?? files.length)}
          footnote="Available to Students"
          footnoteClassName="text-primary-dark"
        />
        <StatCard icon={Download} title="Total Downloads" value={stats ? formatBytes(stats.totalSize) : '—'} footnote="Library Size" />
        <StatCard
          icon={Presentation}
          title="Recently Added"
          value={String(files.filter(isRecent).length)}
          footnote="New this Week"
          footnoteClassName="text-success"
        />
      </section>
      )}

      {/* Subject folders */}
      {initialLoading || (error && !data) ? null : (
      <section aria-label="Subjects">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Subjects</h2>
          <button
            type="button"
            onClick={() => scrollFolders(1)}
            aria-label="Scroll to more subjects"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div
          ref={foldersRef}
          className="flex snap-x gap-4 overflow-x-auto pb-2 scrollbar-thin"
        >
          <button type="button" onClick={() => { setSubjectFilter(null); setPage(1) }} className={cx('group flex w-[230px] shrink-0 snap-start items-center gap-3.5 rounded-2xl border p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover', !subjectFilter ? 'border-primary bg-primary-light/50' : 'border-line bg-white hover:border-primary/30')}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary-dark group-hover:bg-primary group-hover:text-white"><FolderOpen size={22} aria-hidden="true" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">All</span><span className="mt-0.5 block text-xs text-ink-soft">{stats?.totalFiles ?? 0} Files</span></span>
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id ?? 'general'}
              type="button"
              onClick={() => { setSubjectFilter(folder.id); setPage(1) }}
              className={cx('group flex w-[230px] shrink-0 snap-start items-center gap-3.5 rounded-2xl border p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover', subjectFilter === folder.id ? 'border-primary bg-primary-light/50' : 'border-line bg-white hover:border-primary/30')}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-light text-primary-dark transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
                <FolderOpen size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink" title={folder.subject}>
                  {folder.subject}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">{folder.fileCount} Files</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      )}

      {/* All materials table */}
      <Card className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-ink">All Materials</h2>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Sort by
            <select
              aria-label="Sort materials"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="h-9 rounded-lg border border-line bg-white px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
            >
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">Size</option>
            </select>
          </label>
        </div>

        {/* Table (md+) */}
        {error && !data ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={reload} compact />
          </div>
        ) : initialLoading ? (
          <SkeletonRows rows={5} />
        ) : (
        <>
        <div className="hidden overflow-x-auto md:block scrollbar-thin">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">File Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Subject</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Uploaded By</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Size</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileTypeBadge type={file.type} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{file.name}</p>
                        <p className="truncate text-xs text-ink-soft">{file.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-ink-soft">{file.subject}</td>
                  <td className="px-4 py-3.5 text-ink-soft">{file.uploadedBy}</td>
                  <td className="px-4 py-3.5 text-ink-soft">{file.date}</td>
                  <td className="px-4 py-3.5 text-ink-soft">{file.size}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex justify-end">
                      <RowActions file={file} deleting={deletingId === file.id} onDownload={handleDownload} onDelete={handleDelete} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card list (mobile) */}
        <ul className="divide-y divide-line md:hidden">
          {filteredFiles.map((file) => (
            <li key={file.id} className="p-4">
              <div className="flex items-start gap-3">
                <FileTypeBadge type={file.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{file.name}</p>
                  <p className="truncate text-xs text-ink-soft">{file.subtitle}</p>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    {file.subject} • {file.uploadedBy}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {file.date} • {file.size}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <RowActions file={file} deleting={deletingId === file.id} onDownload={handleDownload} onDelete={handleDelete} />
              </div>
            </li>
          ))}
        </ul>
        </>
        )}

        {!loading && !error && filteredFiles.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No materials found for &ldquo;{query}&rdquo;.
          </p>
        )}

        {/* Pagination — only when more than one page */}
        {(() => {
          const pagination = (data as any)?.pagination
          const total: number = pagination?.total ?? filteredFiles.length
          const totalPages: number = pagination?.totalPages ?? (total > PAGE_SIZE ? Math.ceil(total / PAGE_SIZE) : 1)
          if (totalPages <= 1) return null
          const start = (page - 1) * PAGE_SIZE + 1
          const end = Math.min(page * PAGE_SIZE, total)
          const pages: (number|string)[] = totalPages <=5 ? Array.from({length: totalPages}, (_,i)=>i+1) : page <=3 ? [1,2,3,'…', totalPages] : page >= totalPages-2 ? [1,'…', totalPages-2, totalPages-1, totalPages] : [1,'…', page-1, page, page+1, '…', totalPages]
          return (
            <div className="flex items-center justify-between border-t border-line px-5 py-4 sm:px-6">
              <p className="text-xs text-ink-soft sm:text-sm">
                Showing <strong className="text-ink">{start}–{end}</strong> of <strong className="text-ink">{total}</strong> files
              </p>
              <nav aria-label="Pagination" className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft disabled:opacity-40"><ChevronLeft size={15} aria-hidden="true" /></button>
                {pages.map((p, idx)=> typeof p==='string' ? <span key={`e-${idx}`} className="px-1 text-sm text-ink-soft">…</span> : <button key={p} type="button" aria-current={p===page ? 'page':undefined} onClick={()=>setPage(p as number)} className={cx('h-8 w-8 rounded-lg text-sm font-semibold transition-colors duration-200', p===page ? 'bg-primary text-white':'text-ink-soft hover:bg-primary-light hover:text-primary-dark')}>{p}</button>)}
                <button type="button" aria-label="Next page" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft disabled:opacity-40 hover:border-primary/40 hover:text-primary"><ChevronRight size={15} aria-hidden="true" /></button>
              </nav>
            </div>
          )
        })()}
      </Card>

      {/* Upload dialog */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Material"
        subtitle="Files become available to students once synced."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="upload-form" loading={uploading}>
              <Upload size={16} aria-hidden="true" />
              Upload
            </Button>
          </>
        }
      >
        <form id="upload-form" onSubmit={handleUpload} noValidate className="space-y-4">
          <FileField
            label="File"
            required
            fileName={uploadFile?.name ?? null}
            onChange={(f) => {
              setUploadFile(f)
              setErrors((prev) => ({ ...prev, file: undefined }))
            }}
            error={errors.file}
          />
          <SelectField
            id="material-subject"
            label="Subject"
            required
            placeholder="Select subject"
            options={(subjects ?? []).map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value)
              setErrors((prev) => ({ ...prev, subject: undefined }))
            }}
            error={errors.subject}
          />
          {subjectsError && !subjects && (
            <ErrorState message={subjectsError} onRetry={reloadSubjects} compact />
          )}
          <TextField
            id="material-title"
            label="Title"
            required
            placeholder="e.g. Unit 3 — Neural Networks"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setErrors((prev) => ({ ...prev, title: undefined }))
            }}
            error={errors.title}
          />
          <TextAreaField
            id="material-description"
            label="Description"
            placeholder="Short summary of what this file covers"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  )
}
