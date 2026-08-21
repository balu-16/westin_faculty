import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CalendarDays, Download, FileText, FileUp } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { FileField, SelectField, TextField } from '../../components/FormFields'
import { SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { apiFetch, uploadBytes, useApi } from '../../lib/api'
import { mapReport, type ApiReport, type ApiSubject, type Paginated } from '../../lib/mappers'
import { useSections } from '../../contexts/SectionsContext'
import type { DailyReport } from '../../types'
import { todayISO } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const PAGE_SIZE = 10

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

export function FacultyReports() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const { sections } = useSections()

  const [page, setPage] = useState(1)

  const { data: reportsData, error, loading, reload } = useApi<Paginated<ApiReport> | ApiReport[]>(
    'faculty-portal.session',
    `/api/reports/mine?page=${page}&pageSize=${PAGE_SIZE}`,
    [page],
  )
  const { data: subjects } = useApi<ApiSubject[]>('faculty-portal.session', '/api/subjects')
  const rows = (reportsData as Paginated<ApiReport>)?.rows ?? (reportsData as ApiReport[] | undefined) ?? []
  // Handle legacy array shape: paginated envelope {rows,total} vs plain array
  const reports = (Array.isArray(rows) ? rows : []).map(mapReport)
  const total = (reportsData as Paginated<ApiReport>)?.total ?? reports.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const visible = reports.length

  const [sectionId, setSectionId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [date, setDate] = useState(todayISO)
  const [topic, setTopic] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    section?: string
    subject?: string
    topic?: string
    file?: string
  }>({})

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!sectionId) nextErrors.section = 'Select a section.'
    if (!subjectId) nextErrors.subject = 'Select a subject.'
    if (!topic.trim()) nextErrors.topic = 'Topic covered is required.'
    if (!file) nextErrors.file = 'Attach the report file (PDF or DOC).'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !file) return

    setSubmitting(true)
    try {
      // Step 1 — request a signed upload URL, Step 2 — PUT the bytes,
      // Step 3 — register the report row with the returned storage path.
      const { path, url } = await apiFetch<{ path: string; url: string }>(
        '/api/reports/upload-url',
        {
          method: 'POST',
          sessionKey: 'faculty-portal.session',
          body: { name: file.name, contentType: file.type || 'application/pdf', sizeBytes: file.size },
        },
      )
      await uploadBytes(url, file, file.type || 'application/pdf')
      await apiFetch('/api/reports', {
        method: 'POST',
        sessionKey: 'faculty-portal.session',
        body: { sectionId, subjectId, reportDate: date, topic: topic.trim(), attachmentPath: path },
      })
      toast.success('Daily report submitted.')
      setTopic('')
      setFile(null)
      setErrors({})
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not submit the report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Daily Reports"
        subtitle="Report what was taught in each class."
        onMenuClick={openMenu}
      />

      {/* Submit form */}
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <FileUp size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Submit Class Report</h2>
            <p className="text-xs text-ink-soft">Due by 6:00 PM on teaching days.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="report-section"
              label="Section"
              required
              placeholder="Select section"
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value)
                setErrors((prev) => ({ ...prev, section: undefined }))
              }}
              error={errors.section}
            />
            <SelectField
              id="report-subject"
              label="Subject"
              required
              placeholder="Select subject"
              options={(subjects ?? []).map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value)
                setErrors((prev) => ({ ...prev, subject: undefined }))
              }}
              error={errors.subject}
            />
            <TextField
              id="report-date"
              label="Date"
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextField
              id="report-topic"
              label="Topic Covered"
              required
              placeholder="e.g. Gradient descent walkthrough"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                setErrors((prev) => ({ ...prev, topic: undefined }))
              }}
              error={errors.topic}
            />
          </div>
          <div className="mt-4">
            <FileField
              label="Report File"
              required
              hint="PDF or DOC — up to 20 MB"
              fileName={file?.name ?? null}
              onChange={(f) => {
                setFile(f)
                setErrors((prev) => ({ ...prev, file: undefined }))
              }}
              error={errors.file}
            />
          </div>
          <div className="mt-5">
            <Button type="submit" loading={submitting}>
              <FileUp size={16} aria-hidden="true" />
              Submit Report
            </Button>
          </div>
        </form>
      </Card>

      {/* Previously submitted */}
      <Card className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
            <FileText size={18} className="text-primary" aria-hidden="true" />
            Submitted Reports
          </h3>
          <span className="text-sm font-medium text-ink-soft">{reports.length} reports</span>
        </div>

        {/* Table (md+) */}
        {error && !reportsData ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={reload} compact />
          </div>
        ) : loading && !reportsData ? (
          <SkeletonRows rows={5} />
        ) : (
        <>
        <div className="hidden overflow-x-auto md:block scrollbar-thin">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Section</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Subject</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Topic</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">File</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 text-ink-soft">{report.date}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-ink">{report.section}</td>
                  <td className="px-4 py-3.5 text-ink-soft">{report.subject}</td>
                  <td className="px-4 py-3.5 text-ink-soft">{report.topic}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex justify-end">
                      <FileLink report={report} onMissing={() => toast.danger('No attachment on this report.')} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card list (mobile) */}
        <ul className="divide-y divide-line md:hidden">
          {reports.map((report) => (
            <li key={report.id} className="space-y-2 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-ink">{report.subject}</p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
                  <CalendarDays size={12} className="text-primary" aria-hidden="true" />
                  {report.date}
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                {report.section} • {report.topic}
              </p>
              <div className="flex justify-end">
                <FileLink report={report} onMissing={() => toast.danger('No attachment on this report.')} />
              </div>
            </li>
          ))}
        </ul>
        </>
        )}

        {!loading && !error && reports.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No reports submitted yet.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p className="text-xs text-ink-soft sm:text-sm">
            Showing <strong className="text-ink">{visible}</strong> of{' '}
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
