import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Calendar, ChevronDown, ChevronUp, History as HistoryIcon, Search, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { PageLoader } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { StatusBadge } from '../../components/StatusBadge'
import { apiFetch, useApi } from '../../lib/api'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

interface HistoryRow {
  id: string
  senderAdminId: string | null
  senderName: string
  messageTitle: string
  messageBody: string
  targetType: 'all_faculty' | 'selected_faculty' | 'admins' | 'all_students' | 'selected_students' | 'system'
  kind: string | null
  createdAt: string
  onesignalNotificationId: string | null
  recipientCount: number
}

interface HistoryResponse {
  rows: HistoryRow[]
  total: number
  page: number
  pageSize: number
}

interface RecipientRow {
  id: string
  recipientType: 'faculty' | 'admin' | 'student'
  recipientId: string
  name: string
  email: string | null
  department: string | null
  facultyId: string | null
  adminId: string | null
  studentId: string | null
  delivered: boolean | null
}

const KIND_LABELS: Record<string, string> = {
  announcement: 'Announcement',
  event: 'Event',
  attendance_absent: 'Attendance',
  report_reminder: 'Report Reminder',
}

function targetLabel(row: Pick<HistoryRow, 'targetType' | 'kind'>): string {
  const { targetType: t, kind } = row
  if (t === 'all_faculty') return 'All Faculty'
  if (t === 'selected_faculty') return 'Selected Faculty'
  if (t === 'admins') return 'Other Admins'
  if (t === 'all_students') return 'All Students'
  if (t === 'selected_students') return 'Selected Students'
  return kind && KIND_LABELS[kind] ? `Automatic — ${KIND_LABELS[kind]}` : 'Automatic'
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
  } catch {
    return iso
  }
}

export function AdminNotificationsHistory() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const [page, setPage] = useState(1)
  const [senderAdminId, setSenderAdminId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recipientsById, setRecipientsById] = useState<Record<string, RecipientRow[]>>({})
  const [loadingRecipients, setLoadingRecipients] = useState<string | null>(null)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('pageSize', '20')
    if (senderAdminId.trim()) p.set('senderAdminId', senderAdminId.trim())
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return p.toString()
  }, [page, senderAdminId, from, to])

  const { data, error, loading, reload } = useApi<HistoryResponse>('admin-portal.session', `/api/notifications/history?${qs}`, [
    qs,
  ])

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const toggleExpand = async (row: HistoryRow) => {
    const id = row.id
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (recipientsById[id]) return
    setLoadingRecipients(id)
    try {
      const detail = (await apiFetch(`/api/notifications/history/${id}`, {
        sessionKey: 'admin-portal.session',
      })) as { recipients: RecipientRow[] }
      setRecipientsById((prev) => ({ ...prev, [id]: detail.recipients ?? [] }))
    } catch {
      // keep expanded but show error via inline
      setRecipientsById((prev) => ({ ...prev, [id]: [] }))
    } finally {
      setLoadingRecipients(null)
    }
  }

  const applyFilters = () => {
    setPage(1)
    // qs recomputes via deps; no extra reload needed but force one to bypass cache TTL
    // useApi reload will be triggered by qs change; ensure page reset is applied
  }

  const clearFilters = () => {
    setSenderAdminId('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <Header
        title="Notification History"
        subtitle="Every notification ever sent — most recent first. Click a row to see all recipients."
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2">
            <Search size={16} className="text-ink-soft" aria-hidden="true" />
            <input
              type="text"
              value={senderAdminId}
              onChange={(e) => setSenderAdminId(e.target.value)}
              placeholder="Filter by sender admin ID (UUID)…"
              className="h-9 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Calendar size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-full min-w-[120px] flex-1 rounded-xl border border-line bg-white px-3 text-sm focus:border-primary focus:outline-none sm:w-auto sm:flex-none" />
            <span className="text-sm text-ink-soft">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-full min-w-[120px] flex-1 rounded-xl border border-line bg-white px-3 text-sm focus:border-primary focus:outline-none sm:w-auto sm:flex-none" />
          </div>
          <Button variant="secondary" size="sm" onClick={applyFilters}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <HistoryIcon size={16} className="text-primary" aria-hidden="true" />
            {loading && !data ? 'Loading…' : `${total} notification${total === 1 ? '' : 's'}`}
          </h3>
          <span className="text-xs text-ink-soft">Page {page} of {totalPages} • 20 per page</span>
        </div>

        {error && !data ? (
          <div className="mt-4">
            <ErrorState message={error} onRetry={reload} compact />
          </div>
        ) : loading && !data ? (
          <PageLoader label="Fetching history" />
        ) : rows.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-line bg-primary-lighter/40 px-6 py-10 text-center text-sm text-ink-soft">
            No notifications found for the current filters. Send your first notification from{' '}
            <span className="font-semibold text-primary-dark">Notifications → Send Notification</span>.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-primary-lighter/40 text-xs uppercase tracking-wide text-ink-soft">
                    <th scope="col" className="px-4 py-3 font-semibold">Date / Time (IST)</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Sent By</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Title</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Target</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Recipients</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isExpanded = expandedId === row.id
                    const recs = recipientsById[row.id]
                    return (
                      <>
                        <tr key={row.id} className={`border-b border-line/60 transition-colors hover:bg-primary-lighter/40 ${isExpanded ? 'bg-primary-lighter/60' : ''}`}>
                          <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatWhen(row.createdAt)}</td>
                          <td className="px-4 py-3 font-medium text-ink">{row.senderName}</td>
                          <td className="max-w-[280px] px-4 py-3">
                            <p className="truncate font-semibold text-ink">{row.messageTitle}</p>
                            <p className="truncate text-xs text-ink-soft">{row.messageBody}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.targetType === 'system' ? 'bg-success/15 text-success' : 'bg-primary-light text-primary-dark'}`}>{targetLabel(row)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-ink">
                              <Users size={14} className="text-ink-soft" aria-hidden="true" />
                              {row.recipientCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleExpand(row)}
                              aria-expanded={isExpanded}
                              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:text-primary-dark"
                            >
                              {isExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${row.id}-detail`} className="bg-white">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="rounded-xl border border-line bg-primary-lighter/20 p-4">
                                <p className="text-sm font-semibold text-ink">Full message</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{row.messageBody}</p>
                                <p className="mt-3 text-xs text-ink-soft">OneSignal ID: {row.onesignalNotificationId ?? '— (skipped in dev without REST key)'}</p>

                                <div className="mt-4">
                                  <p className="text-sm font-semibold text-ink">Recipients ({row.recipientCount})</p>
                                  {loadingRecipients === row.id ? (
                                    <div className="mt-2 space-y-2">
                                      <div className="h-8 animate-pulse rounded-lg bg-line/60" />
                                      <div className="h-8 animate-pulse rounded-lg bg-line/60" />
                                    </div>
                                  ) : recs && recs.length > 0 ? (
                                    <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      {recs.map((r) => (
                                        <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2">
                                          <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-ink">{r.name}</span>
                                            <span className="block truncate text-xs text-ink-soft">
                                              {r.recipientType === 'faculty' ? r.facultyId ?? r.email : r.recipientType === 'student' ? r.studentId ?? r.email : r.adminId ?? r.email} • {r.department ?? '—'}
                                            </span>
                                          </span>
                                          <StatusBadge status={r.recipientType === 'faculty' ? 'active' : 'active'} />
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-sm text-ink-soft">No recipients recorded (this should not happen — check server logs).</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-4 py-3">
              <span className="text-xs text-ink-soft">
                Showing {rows.length} of {total} • Free tier: max 10,000 subscribers per send (no chunking needed for current cohort)
              </span>
              <nav aria-label="History pagination" className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ‹ Prev
                </Button>
                <span className="px-2 text-sm font-medium text-ink-soft">
                  Page <strong className="text-ink">{page}</strong> of <strong className="text-ink">{totalPages}</strong>
                </span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next ›
                </Button>
              </nav>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
