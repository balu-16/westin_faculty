import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { FileClock, ImagePlus, Plus, RotateCcw, Save, Send, X } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorState } from '../../components/ErrorState'
import { PageLoader } from '../../components/Loading'
import { SelectField, TextAreaField, TextField } from '../../components/FormFields'
import { StatusBadge } from '../../components/StatusBadge'
import { useToast } from '../../components/Toast'
import { apiFetch, uploadBytes, useApi } from '../../lib/api'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const SESSION_KEY = 'admin-portal.session' as const

const ENTRY_TYPES = [
  ['page', 'College page'],
  ['homepage-section', 'Homepage section'],
  ['program', 'Program'],
  ['management', 'Management profile'],
  ['news', 'News'],
  ['blog', 'Blog post'],
  ['event-story', 'Public event story'],
  ['success-story', 'Success story'],
  ['testimonial', 'Testimonial'],
  ['gallery', 'Gallery album'],
  ['magazine', 'Magazine edition'],
] as const

type EntryType = (typeof ENTRY_TYPES)[number][0]

interface WebsiteEntry {
  id: string
  entryType: EntryType
  slug: string
  draftRevisionId: string | null
  publishedRevisionId: string | null
  draftRevisionNumber: number | null
  publishedRevisionNumber: number | null
  revisionCount: number
  createdAt: string
  updatedAt: string
  status: 'draft' | 'published'
}

interface WebsiteRevision {
  id: string
  revisionNumber: number
  content: Record<string, unknown>
  seo: Record<string, unknown>
  createdAt: string
  publishedAt: string | null
  unpublishedAt: string | null
}

interface WebsiteDetail extends WebsiteEntry {
  revisions: WebsiteRevision[]
}

interface WebsiteList {
  items: WebsiteEntry[]
}

interface WebsiteSettings {
  items: Array<{ key: string; value: Record<string, unknown>; updatedAt: string }>
}

function textValue(content: Record<string, unknown>, key: string) {
  const value = content[key]
  return typeof value === 'string' ? value : ''
}

function stringList(content: Record<string, unknown>, key: string) {
  const value = content[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').join('\n') : ''
}

function buildContent(fields: {
  eyebrow: string
  title: string
  summary: string
  body: string
  bullets: string
}) {
  return {
    eyebrow: fields.eyebrow.trim(),
    title: fields.title.trim(),
    summary: fields.summary.trim(),
    body: fields.body.trim(),
    bullets: fields.bullets.split('\n').map((item) => item.trim()).filter(Boolean),
  }
}

function buildSeo(title: string, description: string) {
  return { title: title.trim(), description: description.trim() }
}

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export function AdminWebsite() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const entries = useApi<WebsiteList>(SESSION_KEY, '/api/admin/website/entries')
  const settings = useApi<WebsiteSettings>(SESSION_KEY, '/api/admin/website/settings')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detail = useApi<WebsiteDetail>(
    SESSION_KEY,
    selectedId ? '/api/admin/website/entries/' + selectedId : null,
    [selectedId],
  )
  const [creating, setCreating] = useState(false)
  const [entryType, setEntryType] = useState<EntryType>('page')
  const [slug, setSlug] = useState('')
  const [eyebrow, setEyebrow] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [bullets, setBullets] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [siteTitle, setSiteTitle] = useState('')
  const [footerSummary, setFooterSummary] = useState('')

  const selectedEntry = useMemo(
    () => entries.data?.items.find((item) => item.id === selectedId) ?? null,
    [entries.data, selectedId],
  )

  useEffect(() => {
    if (!detail.data || creating) return
    const revision = detail.data.revisions.find((item) => item.id === detail.data?.draftRevisionId) ?? detail.data.revisions[0]
    const content = revision?.content ?? {}
    const seo = revision?.seo ?? {}
    setEntryType(detail.data.entryType)
    setSlug(detail.data.slug)
    setEyebrow(textValue(content, 'eyebrow'))
    setTitle(textValue(content, 'title'))
    setSummary(textValue(content, 'summary'))
    setBody(textValue(content, 'body'))
    setBullets(stringList(content, 'bullets'))
    setSeoTitle(textValue(seo, 'title'))
    setSeoDescription(textValue(seo, 'description'))
    setActionError('')
  }, [creating, detail.data])

  useEffect(() => {
    const site = settings.data?.items.find((item) => item.key === 'site')
    if (!site) return
    setSiteTitle(textValue(site.value, 'title'))
    setFooterSummary(textValue(site.value, 'footerSummary'))
  }, [settings.data])

  const resetNew = () => {
    setCreating(true)
    setSelectedId(null)
    setEntryType('page')
    setSlug('')
    setEyebrow('')
    setTitle('')
    setSummary('')
    setBody('')
    setBullets('')
    setSeoTitle('')
    setSeoDescription('')
    setFile(null)
    setAltText('')
    setActionError('')
  }

  const selectEntry = (id: string) => {
    setCreating(false)
    setSelectedId(id)
    setFile(null)
    setAltText('')
  }

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!slug.trim() || !title.trim()) {
      setActionError('A lowercase slug and a title are required before saving.')
      return
    }
    setSaving(true)
    setActionError('')
    try {
      const content = buildContent({ eyebrow, title, summary, body, bullets })
      const seo = buildSeo(seoTitle, seoDescription)
      if (creating) {
        const created = await apiFetch<WebsiteDetail>('/api/admin/website/entries', {
          method: 'POST',
          sessionKey: SESSION_KEY,
          body: { entryType, slug: slug.trim(), content, seo },
        })
        setCreating(false)
        setSelectedId(created.id)
        toast.success('Draft created.')
      } else if (selectedId) {
        await apiFetch('/api/admin/website/entries/' + selectedId, {
          method: 'PATCH',
          sessionKey: SESSION_KEY,
          body: { slug: slug.trim(), content, seo },
        })
        toast.success('Draft saved.')
      }
      entries.reload()
      detail.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save this draft.'
      setActionError(message)
      toast.danger(message)
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!selectedId || !detail.data?.draftRevisionId) return
    setSaving(true)
    setActionError('')
    try {
      await apiFetch('/api/admin/website/entries/' + selectedId + '/publish', {
        method: 'POST',
        sessionKey: SESSION_KEY,
        body: { revisionId: detail.data.draftRevisionId },
      })
      toast.success('Revision published to the public API.')
      entries.reload()
      detail.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not publish this revision.'
      setActionError(message)
      toast.danger(message)
    } finally {
      setSaving(false)
    }
  }

  const unpublish = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await apiFetch('/api/admin/website/entries/' + selectedId + '/unpublish', {
        method: 'POST',
        sessionKey: SESSION_KEY,
      })
      toast.success('Entry unpublished.')
      entries.reload()
      detail.reload()
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Could not unpublish this entry.')
    } finally {
      setSaving(false)
    }
  }

  const restore = async (revisionId: string) => {
    if (!selectedId) return
    setSaving(true)
    try {
      await apiFetch('/api/admin/website/entries/' + selectedId + '/restore', {
        method: 'POST',
        sessionKey: SESSION_KEY,
        body: { revisionId },
      })
      toast.success('Revision restored as the draft.')
      detail.reload()
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Could not restore this revision.')
    } finally {
      setSaving(false)
    }
  }

  const upload = async () => {
    if (!file || !altText.trim() || !selectedId || !detail.data?.draftRevisionId) return
    setUploading(true)
    try {
      const signed = await apiFetch<{ path: string; url: string }>('/api/admin/website/media/upload-url', {
        method: 'POST',
        sessionKey: SESSION_KEY,
        body: { filename: file.name, contentType: file.type, sizeBytes: file.size },
      })
      await uploadBytes(signed.url, file, file.type)
      await apiFetch('/api/admin/website/media', {
        method: 'POST',
        sessionKey: SESSION_KEY,
        body: {
          storagePath: signed.path,
          entryId: selectedId,
          revisionId: detail.data.draftRevisionId,
          mimeType: file.type,
          sizeBytes: file.size,
          altText: altText.trim(),
        },
      })
      setFile(null)
      setAltText('')
      toast.success('Media attached to the current draft.')
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Could not upload this asset.')
    } finally {
      setUploading(false)
    }
  }

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/api/admin/website/settings/site', {
        method: 'PATCH',
        sessionKey: SESSION_KEY,
        body: { value: { title: siteTitle.trim(), footerSummary: footerSummary.trim() } },
      })
      settings.reload()
      toast.success('Website settings saved as the current public configuration.')
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Could not save website settings.')
    } finally {
      setSaving(false)
    }
  }

  const contentForm = (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="website-entry-type"
          label="Content type"
          value={entryType}
          disabled={!creating}
          onChange={(event) => setEntryType(event.target.value as EntryType)}
          options={ENTRY_TYPES.map(([value, label]) => ({ value, label }))}
        />
        <TextField
          id="website-slug"
          label="URL slug"
          required
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="about-westin"
          disabled={saving}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="website-eyebrow" label="Eyebrow" value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} maxLength={120} />
        <TextField id="website-title" label="Title" required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} />
      </div>
      <TextAreaField id="website-summary" label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={500} />
      <TextAreaField id="website-body" label="Body copy" hint="Plain text only. Use separate lines for paragraphs." value={body} onChange={(event) => setBody(event.target.value)} maxLength={6000} />
      <TextAreaField id="website-bullets" label="Key points" hint="One point per line." value={bullets} onChange={(event) => setBullets(event.target.value)} maxLength={1200} />
      <div className="border-t border-line pt-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">Search metadata</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="website-seo-title" label="SEO title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={160} />
          <TextAreaField id="website-seo-description" label="SEO description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={300} />
        </div>
      </div>
      {actionError && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">{actionError}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={saving}><Save size={16} aria-hidden="true" />{creating ? 'Create draft' : 'Save draft'}</Button>
        {!creating && selectedEntry?.draftRevisionId && (
          <Button type="button" variant="secondary" onClick={publish} loading={saving}><Send size={16} aria-hidden="true" />Publish draft</Button>
        )}
        {!creating && selectedEntry?.publishedRevisionId && (
          <Button type="button" variant="ghost" onClick={unpublish} loading={saving}><X size={16} aria-hidden="true" />Unpublish</Button>
        )}
      </div>
    </form>
  )

  return (
    <div className="space-y-6">
      <Header
        title="Website"
        subtitle="Draft, review, and publish approved public content from one admin-only workspace."
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      <div className="rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm leading-6 text-ink">
        Public preview routes use clearly marked local fixtures until approved content is loaded. Publishing here changes only the published website API revision.
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-4">
            <div>
              <h2 className="text-sm font-bold text-ink">Entries</h2>
              <p className="mt-1 text-xs text-ink-soft">{entries.data?.items.length ?? 0} total</p>
            </div>
            <Button size="sm" onClick={resetNew}><Plus size={15} aria-hidden="true" />New</Button>
          </div>
          {entries.loading && !entries.data ? <PageLoader label="Loading website entries" size={76} className="min-h-[180px]" /> : entries.error && !entries.data ? <ErrorState compact message={entries.error} onRetry={entries.reload} /> : (
            <div className="max-h-[620px] overflow-y-auto p-2">
              {entries.data?.items.length ? entries.data.items.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectEntry(entry.id)}
                  className={'mb-1 w-full rounded-xl px-3 py-3 text-left transition-colors ' + (selectedId === entry.id && !creating ? 'bg-primary-lighter' : 'hover:bg-page')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{entry.slug}</span>
                    <StatusBadge status={entry.status === 'published' ? 'published' : 'draft'} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{entry.entryType} · revised {dateLabel(entry.updatedAt)}</p>
                </button>
              )) : <p className="px-4 py-10 text-center text-sm text-ink-soft">No entries yet. Start with an approved page draft.</p>}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{creating ? 'Create a structured draft' : selectedId ? 'Edit website entry' : 'Choose an entry'}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-soft">Fields are stored as a validated revision. HTML and script-like content are rejected by the API.</p>
              </div>
              {!creating && selectedId && <Button type="button" variant="ghost" size="sm" onClick={resetNew}><Plus size={15} aria-hidden="true" />New draft</Button>}
            </div>
            {creating || selectedId ? (creating ? contentForm : detail.loading && !detail.data ? <PageLoader label="Loading draft" size={80} className="min-h-[240px]" /> : detail.error && !detail.data ? <ErrorState message={detail.error} onRetry={detail.reload} /> : contentForm) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-line bg-page px-6 text-center text-sm text-ink-soft">Select an entry from the left or create a new draft.</div>
            )}
          </Card>

          {!creating && detail.data && selectedId && (
            <>
              <Card>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark"><FileClock size={19} aria-hidden="true" /></span>
                  <div><h2 className="text-base font-bold text-ink">Revision history</h2><p className="text-xs text-ink-soft">Restore a prior revision as a draft, then review before publishing.</p></div>
                </div>
                <div className="space-y-2">
                  {detail.data.revisions.map((revision) => (
                    <div key={revision.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                      <div><p className="text-sm font-semibold text-ink">Revision {revision.revisionNumber}</p><p className="mt-1 text-xs text-ink-soft">{dateLabel(revision.createdAt)}{revision.publishedAt ? ' · published' : ''}</p></div>
                      <div className="flex items-center gap-2">
                        {revision.id === detail.data!.draftRevisionId && <StatusBadge status="draft" />}
                        {revision.id === detail.data!.publishedRevisionId && <StatusBadge status="published" />}
                        {revision.id !== detail.data!.draftRevisionId && <Button type="button" variant="secondary" size="sm" onClick={() => restore(revision.id)} loading={saving}><RotateCcw size={14} aria-hidden="true" />Restore</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark"><ImagePlus size={19} aria-hidden="true" /></span>
                  <div><h2 className="text-base font-bold text-ink">Draft media</h2><p className="text-xs text-ink-soft">Images, PDFs, and video use approved private storage paths and require alt text.</p></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <TextField id="website-media-alt" label="Alt text" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the meaningful image content" />
                  <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">Asset</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block h-11 w-full rounded-xl border border-line bg-primary-lighter/60 px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-dark" /></label>
                  <Button type="button" onClick={upload} loading={uploading} disabled={!file || !altText.trim()}><ImagePlus size={16} aria-hidden="true" />Attach</Button>
                </div>
                <p className="mt-3 text-xs text-ink-soft">Attach to the current draft revision. Media becomes publicly visible only when that revision is published.</p>
              </Card>
            </>
          )}
        </div>
      </div>
      <Card>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-ink">Global public settings</h2><p className="mt-1 text-xs text-ink-soft">Keep navigation, footer, and contact settings structured so public templates stay stable.</p></div>
          {settings.loading && <span className="text-xs text-ink-soft">Loading…</span>}
        </div>
        <form onSubmit={saveSettings} className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <TextField id="website-site-title" label="Public site title" value={siteTitle} onChange={(event) => setSiteTitle(event.target.value)} maxLength={160} placeholder="Westin College" />
          <TextField id="website-footer-summary" label="Footer summary" value={footerSummary} onChange={(event) => setFooterSummary(event.target.value)} maxLength={300} placeholder="Approved short description" />
          <div className="sm:col-span-2"><Button type="submit" variant="secondary" loading={saving}><Save size={16} aria-hidden="true" />Save settings</Button></div>
        </form>
      </Card>
    </div>
  )
}
