import { memo, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CalendarDays, Download, FileText, Search } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SelectField } from '../../components/FormFields'
import { SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useApi } from '../../lib/api'
import { mapReport, type ApiReport, type Paginated } from '../../lib/mappers'
import { useSections } from '../../contexts/SectionsContext'
import type { DailyReport } from '../../types'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const noop = () => undefined

function FileLink({ report, onMissing }: { report: DailyReport; onMissing: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (report.attachmentUrl) window.open(report.attachmentUrl, '_blank', 'noopener')
        else onMissing()
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 px-3 py-1.5 text-xs font-semibold text-primary-dark transition-colors duration-200 hover:bg-primary hover:text-white"
    >
      <Download size={13} aria-hidden="true" />
      {report.fileName}
    </button>
  )
}

/** Memoized report rows — the page refetches as filters settle, so rows skip
 *  re-rendering whenever their own report record is unchanged. */
const ReportTableRow = memo(function ReportTableRow({ report }: { report: DailyReport }) {
  return (
    <tr className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60">
      <td className="whitespace-nowrap px-6 py-3.5 font-semibold text-ink">
        {report.submittedBy}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
          {report.section}
        </span>
      </td>
      <td className="px-4 py-3.5 text-ink-soft">{report.subject}</td>
      <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">{report.date}</td>
      <td className="px-4 py-3.5 text-ink-soft">{report.topic}</td>
      <td className="px-6 py-3.5">
        <div className="flex justify-end">
          <FileLink report={report} onMissing={noop} />
        </div>
      </td>
    </tr>
  )
})

const ReportCardRow = memo(function ReportCardRow({ report }: { report: DailyReport }) {
  return (
    <li className="space-y-2 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold text-ink">{report.submittedBy}</p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
          <CalendarDays size={12} className="text-primary" aria-hidden="true" />
          {report.date}
        </span>
      </div>
      <p className="text-xs text-ink-soft">
        {report.section} • {report.subject}
      </p>
      <p className="text-xs text-ink-soft">{report.topic}</p>
      <div className="flex justify-end">
        <FileLink report={report} onMissing={noop} />
      </div>
    </li>
  )
})

export function AdminReports() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const { sections, error: sectionsError, reload: reloadSections } = useSections()

  const [query, setQuery] = useState('')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  // Debounce the search box so the API is hit once typing settles (300 ms)
  // instead of on every keystroke; the input itself stays bound to `query`.
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  // Server-side filtering + paging: /api/reports?search=&sectionId=&from=&to=&page=
  const searchParams = new URLSearchParams()
  if (search) searchParams.set('search', search)
  if (sectionFilter !== 'all') searchParams.set('sectionId', sectionFilter)
  if (fromDate) searchParams.set('from', fromDate)
  if (toDate) searchParams.set('to', toDate)
  searchParams.set('page', String(page))
  searchParams.set('pageSize', '10')
  const listPath = `/api/reports?${searchParams.toString()}`
  const { data, error, loading, reload } = useApi<Paginated<ApiReport>>('admin-portal.session', listPath, [
    search,
    sectionFilter,
    fromDate,
    toDate,
    page,
  ])
  const filtered = useMemo(() => (data?.rows ?? []).map(mapReport), [data])
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 10)))

  const handleFilterReset = (e: FormEvent) => {
    e.preventDefault()
    setQuery('')
    setSectionFilter('all')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <Header
        title={
          <span className="flex items-center gap-2.5">
            <FileText size={26} className="text-primary" aria-hidden="true" />
            Daily Reports
          </span>
        }
        subtitle="All class reports submitted by faculty (read-only)"
        onMenuClick={openMenu}
      />

      {/* Filters */}
      <Card>
        <form onSubmit={handleFilterReset} noValidate>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="report-search" className="mb-1.5 block text-sm font-medium text-ink">
                Search
              </label>
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/70"
                  aria-hidden="true"
                />
                <input
                  id="report-search"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Faculty, subject or topic..."
                  className="h-11 w-full rounded-xl border border-line bg-primary-lighter/60 pl-9 pr-4 text-sm text-ink placeholder:text-ink-soft/60 transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            <SelectField
              id="report-section-filter"
              label="Section"
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value)
                setPage(1)
              }}
              options={[
                { value: 'all', label: 'All Sections' },
                ...sections.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <div>
              <label htmlFor="report-from" className="mb-1.5 block text-sm font-medium text-ink">
                From Date
              </label>
              <input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(1)
                }}
                className="h-11 w-full rounded-xl border border-line bg-primary-lighter/60 px-4 text-sm text-ink transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1.5 block text-sm font-medium text-ink">
                To Date
              </label>
              <input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(1)
                }}
                className="h-11 w-full rounded-xl border border-line bg-primary-lighter/60 px-4 text-sm text-ink transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <Button type="submit" variant="ghost" size="sm">
              Clear Filters
            </Button>
          </div>
        </form>
        {sectionsError && sections.length === 0 && (
          <div className="mt-4">
            <ErrorState message={sectionsError} onRetry={() => void reloadSections()} compact />
          </div>
        )}
      </Card>

      {/* Reports table */}
      <Card className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            Submitted Reports
          </h3>
          <span className="text-sm font-medium text-ink-soft">{filtered.length} reports</span>
        </div>

        {/* Table (md+) */}
        {error && !data ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={reload} compact />
          </div>
        ) : loading && !data ? (
          <SkeletonRows rows={5} />
        ) : (
        <>
        <div className="hidden overflow-x-auto md:block scrollbar-thin">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Faculty Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Section</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Subject</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Topic</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">File</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <ReportTableRow key={report.id} report={report} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Card list (mobile) */}
        <ul className="divide-y divide-line md:hidden">
          {filtered.map((report) => (
            <ReportCardRow key={report.id} report={report} />
          ))}
        </ul>
        </>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No reports match the current filters.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p className="text-xs text-ink-soft sm:text-sm">
            Showing <strong className="text-ink">{filtered.length}</strong> of{' '}
            <strong className="text-ink">{total}</strong> reports
          </p>
          <nav aria-label="Reports pagination" className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ‹ Prev
            </Button>
            <span className="px-1 text-sm font-medium text-ink-soft">
              Page <strong className="text-ink">{page}</strong> of{' '}
              <strong className="text-ink">{totalPages}</strong>
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next ›
            </Button>
          </nav>
        </div>
      </Card>
    </div>
  )
}
