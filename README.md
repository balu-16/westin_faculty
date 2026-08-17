# Westin College — Faculty & Admin Portal

Faculty and admin portals for Westin College, built with the same UI design
system as the student portal. **All data is live** from the Westin API
(`../westin-api`) — the mock data modules are gone. Login uses a 6-digit OTP
emailed by the API (also printed in the API server console in dev).

## Getting started

```bash
npm install
npm run dev -- --port 5174   # http://localhost:5174 (proxies /api -> localhost:4000)
npm run build
```

Start the API first: `cd ../westin-api && npm run dev` (see its README for
migrations + seed).

- Faculty portal: **http://localhost:5174/faculty/login**
- Admin portal: **http://localhost:5174/admin/login**

Demo accounts use OTP only. OTP codes go to the real inbox and the API
console:

- Faculty: `FAC-2025-014` (Dr. Priya Sharma) — CSE-AIML, Associate Professor
- Admin: `ADM-2025-002` (Ananya Verma)

## Portals & routes

### Faculty Portal (`/faculty/…`)

| Route | Page | Highlights |
| --- | --- | --- |
| `/faculty` | Dashboard | Classes today, sections assigned, pending reports, attendance marked + today's schedule |
| `/faculty/timetable` | Timetable | Day tabs + swipeable timeline of the faculty's own teaching schedule |
| `/faculty/attendance` | Attendance | Pick section + hour → 40-student roster with Present/Absent/Leave toggles, "Mark All Present", submit confirmation |
| `/faculty/events` | Events | Add/edit/delete events — syncs to the student portal instantly |
| `/faculty/materials` | Study Materials | Upload/delete material on top of the student-style browser |
| `/faculty/reports` | Daily Reports | Submit class report (section, subject, date, topic, file) + submitted history |
| `/faculty/settings` | Settings | Faculty profile, notifications, appearance, security |

### Admin Portal (`/admin/…`)

| Route | Page | Highlights |
| --- | --- | --- |
| `/admin` | Dashboard | Faculty/student/event/report totals, live activity feed, upcoming events |
| `/admin/teachers` | Teachers | Faculty directory + "Add Faculty" form, **Login Logs** tab |
| `/admin/students` | Students | Section filter + search, "Add Student" form, **Login Logs** tab |
| `/admin/sections` | Sections | Section CRUD, rosters, move students between sections |
| `/admin/timetable` | Timetable Management | Master timetable builder per section/day, server-checked room/faculty/section conflict warnings (409s), XLSX template download + bulk import with row-level validation |
| `/admin/events` | Events | Same event manager as faculty (shared pool) |
| `/admin/materials` | Study Materials | Same upload/delete manager as faculty |
| `/admin/reports` | Daily Reports | Read-only view of **all** faculty reports with search, section and date-range filters |
| `/admin/settings` | Settings | Admin profile, notifications, appearance, security |

## Structure

```
src/
  components/     Shared UI (Button, Card, StatCard, Modal, form fields, Toast,
                  Sidebar, Header, TimetableCard, illustrations, …)
  layouts/        PortalShell + faculty/admin layouts (nav, sidebar, auth guard)
  contexts/       FacultyAuthContext / AdminAuthContext (OTP login, sessions),
                  SectionsContext (live sections/students)
  lib/            api.ts (fetch client, single-flight token refresh, uploads),
                  mappers.ts (API payloads → UI shapes)
  pages/shared/   LoginScreen, ManageEvents, ManageMaterials (reused by both)
  pages/faculty/  Faculty-specific pages
  pages/admin/    Admin-specific pages
```

Events and study materials are shared server-side data — anything added here
appears in the student portal immediately.
