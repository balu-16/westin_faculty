import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Mail, MessageSquare, Phone, Search, StickyNote, UserRound } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ErrorState } from '../../components/ErrorState'
import { PageLoader } from '../../components/Loading'
import { SelectField, TextAreaField, TextField } from '../../components/FormFields'
import { useToast } from '../../components/Toast'
import { apiFetch, useApi } from '../../lib/api'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const SESSION_KEY = 'admin-portal.session' as const
type EnquiryStatus = 'new' | 'contacted' | 'closed'

interface Enquiry {
  id: string
  reference: string
  category: string
  name: string
  email: string | null
  phone: string | null
  programSlug: string | null
  message: string
  status: EnquiryStatus
  createdAt: string
  updatedAt: string
}

interface EnquiryActivity {
  id: string
  actorUserId: string | null
  action: string
  note: string | null
  createdAt: string
}

interface EnquiryList {
  items: Enquiry[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

interface EnquiryDetail extends Enquiry {
  activity: EnquiryActivity[]
}

function statusLabel(status: EnquiryStatus) {
  return status === 'new' ? 'New' : status === 'contacted' ? 'Contacted' : 'Closed'
}

function statusClass(status: EnquiryStatus) {
  return status === 'new'
    ? 'bg-[#EAF6FF] text-[#1468AA]'
    : status === 'contacted'
      ? 'bg-[#FEF3C7] text-[#92400E]'
      : 'bg-[#DCFCE7] text-[#15803D]'
}

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export function AdminEnquiries() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const listPath = useMemo(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (search) params.set('q', search)
    const query = params.toString()
    return '/api/admin/enquiries' + (query ? '?' + query : '')
  }, [search, status])
  const list = useApi<EnquiryList>(SESSION_KEY, listPath, [listPath])
  const detail = useApi<EnquiryDetail>(
    SESSION_KEY,
    selectedId ? '/api/admin/enquiries/' + selectedId : null,
    [selectedId],
  )

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  const updateStatus = async (next: EnquiryStatus) => {
    if (!selectedId) return
    setBusy(true)
    try {
      await apiFetch('/api/admin/enquiries/' + selectedId, {
        method: 'PATCH',
        sessionKey: SESSION_KEY,
        body: { status: next },
      })
      toast.success('Enquiry marked ' + statusLabel(next).toLowerCase() + '.')
      list.reload()
      detail.reload()
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Could not update this enquiry.')
    } finally {
      setBusy(false)
    }
  }

  const addNote = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || !note.trim()) return
    setBusy(true)
    try {
      await apiFetch('/api/admin/enquiries/' + selectedId + '/notes', {
        method: 'POST',
        sessionKey: SESSION_KEY,
        body: { note: note.trim() },
      })
      setNote('')
      toast.success('Internal note added.')
      detail.reload()
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Could not add this note.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Enquiry inbox"
        subtitle="Review public questions and campus-visit requests. Access is limited to administrators."
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      <div className="rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-sm leading-6 text-ink">
        Enquiries are stored for the approved inbox workflow. The public form remains disabled until privacy, retention, and contact-content approval are complete.
      </div>

      <Card>
        <form onSubmit={submitSearch} className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
          <SelectField
            id="enquiry-status"
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: '', label: 'All enquiries' },
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <TextField id="enquiry-search" label="Search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Reference, name, email, or phone" />
          <Button type="submit" variant="secondary"><Search size={16} aria-hidden="true" />Search</Button>
        </form>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div><h2 className="text-base font-bold text-ink">Inbox</h2><p className="mt-1 text-xs text-ink-soft">{list.data?.pagination.total ?? 0} matching enquiries</p></div>
            <MessageSquare size={19} className="text-primary" aria-hidden="true" />
          </div>
          {list.loading && !list.data ? <PageLoader label="Loading enquiries" size={78} className="min-h-[240px]" /> : list.error && !list.data ? <ErrorState compact message={list.error} onRetry={list.reload} /> : (
            <div className="max-h-[650px] overflow-y-auto p-2">
              {list.data?.items.length ? list.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={'mb-1 w-full rounded-xl px-3 py-3 text-left transition-colors ' + (selectedId === item.id ? 'bg-primary-lighter' : 'hover:bg-page')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-ink">{item.name}</span>
                    <span className={'shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' + statusClass(item.status)}>{statusLabel(item.status)}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-soft">{item.reference} · {item.category}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{item.message}</p>
                </button>
              )) : <p className="px-5 py-12 text-center text-sm text-ink-soft">No enquiries match this filter.</p>}
            </div>
          )}
        </Card>

        <Card>
          {!selectedId ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark"><MessageSquare size={21} aria-hidden="true" /></span>
              <h2 className="mt-4 text-base font-bold text-ink">Choose an enquiry</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-ink-soft">Select a message to review its contact details, status, and internal activity.</p>
            </div>
          ) : detail.loading && !detail.data ? <PageLoader label="Loading enquiry" size={78} className="min-h-[360px]" /> : detail.error && !detail.data ? <ErrorState message={detail.error} onRetry={detail.reload} /> : detail.data ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-dark">{detail.data.reference}</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">{detail.data.name}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{detail.data.category} · received {dateLabel(detail.data.createdAt)}</p>
                </div>
                <span className={'rounded-full px-3 py-1.5 text-xs font-bold ' + statusClass(detail.data.status)}>{statusLabel(detail.data.status)}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {detail.data.email && <a href={'mailto:' + detail.data.email} className="flex items-center gap-2 rounded-xl border border-line bg-page px-3 py-3 text-sm font-semibold text-primary-dark"><Mail size={16} aria-hidden="true" />{detail.data.email}</a>}
                {detail.data.phone && <a href={'tel:' + detail.data.phone} className="flex items-center gap-2 rounded-xl border border-line bg-page px-3 py-3 text-sm font-semibold text-primary-dark"><Phone size={16} aria-hidden="true" />{detail.data.phone}</a>}
              </div>
              {detail.data.programSlug && <p className="mt-4 text-sm text-ink-soft">Program interest: <strong className="text-ink">{detail.data.programSlug}</strong></p>}
              <div className="mt-5 rounded-2xl border border-line bg-primary-lighter/40 p-4 text-sm leading-7 text-ink">{detail.data.message}</div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(['new', 'contacted', 'closed'] as EnquiryStatus[]).map((item) => <Button key={item} type="button" size="sm" variant={item === detail.data?.status ? 'primary' : 'secondary'} onClick={() => updateStatus(item)} loading={busy && item !== detail.data?.status}>{statusLabel(item)}</Button>)}
              </div>

              <form onSubmit={addNote} className="mt-7 border-t border-line pt-5">
                <div className="flex items-center gap-2"><StickyNote size={17} className="text-primary" aria-hidden="true" /><h3 className="text-sm font-bold text-ink">Internal note</h3></div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <TextAreaField id="enquiry-note" label="Add a note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className="flex-1" />
                  <Button type="submit" variant="secondary" loading={busy} disabled={!note.trim()}><StickyNote size={15} aria-hidden="true" />Add note</Button>
                </div>
              </form>

              <div className="mt-7 border-t border-line pt-5">
                <div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-success" aria-hidden="true" /><h3 className="text-sm font-bold text-ink">Activity</h3></div>
                <div className="mt-3 space-y-3">
                  {detail.data.activity.length ? detail.data.activity.map((item) => (
                    <div key={item.id} className="flex gap-3 rounded-xl bg-page px-3 py-3 text-xs">
                      <UserRound size={15} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
                      <div><p className="font-semibold text-ink">{item.action.replace(/-/g, ' ')}</p><p className="mt-1 text-ink-soft">{item.note || 'No note'} · {dateLabel(item.createdAt)}</p></div>
                    </div>
                  )) : <p className="text-sm text-ink-soft">No activity recorded.</p>}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
