# Nexus discovery (Phase 0)

Date: 2026-10-02. Method: user logged in by hand in a headed Playwright window; network metadata recorded
(method/status/URL only); then GET-only probes with the saved session.

## Platform
Custom-built, **not** Canvas/Moodle/Brightspace/Classroom.
- Frontend: Next.js App Router (RSC `text/x-component` responses) at `https://students.mesaschool.co.in`
- Backend: JSON REST API at `https://api-students.mesaschool.co.in/api/v1`, envelope `{ "data": ... }` / `{ "error": {code,message} }`
- Pages: `/student`, `/student/lms/{assignments,calendar,courses,attendance,notifications,startup-leaders,mesa-readiness-score}`, `/student/community`

## Chosen connection method: internal JSON API (no HTML scraping)
No official API/token page, iCal or RSS found. The frontend itself calls the JSON API, so we use it directly,
read-only, behind `NexusClient`. Playwright is only needed for the first (manual) login.

## Auth and session
- Login: `POST /api/auth/login` (done by the user, manually; the tool never types the password).
- Session cookie: `refresh_token` (httpOnly, Secure, path `/api/auth`, ~1 year expiry, **rotates on each refresh**).
- `POST /api/auth/refresh` with header `content-type: application/json`, body `{}`, cookie `refresh_token` returns
  `{data:{accessToken,user}}` and a new `refresh_token` Set-Cookie. The new cookie MUST be saved back to
  `.auth/nexus-state.json` after every refresh (old one is then invalid).
- API calls: `Authorization: Bearer <accessToken>` (short-lived, memory only).
- If refresh returns 401 the session is dead: surface "re-login needed" on the dashboard; user re-runs the headed login.
- Only POSTs the client may ever send: `/api/auth/login`, `/api/auth/refresh`.
  **Never** call `POST /announcements/views` (the web app fires it when you open announcements; it records a "view").
  Do not open announcement detail pages in a way that triggers it.

## Data map
| Data | Endpoint (GET) | Notes |
|---|---|---|
| Assignments | `/assignments/my` | 38 items: title, description/instructions (HTML), `allowSubmissionsFrom`, `dueAt`, `cutoffDate`, `allowLate`, `maxMarks`, `isGroup`, `groupSize`, `submissionType`, `maxAttempts`, `materials[]`, `mySubmissionStatus` (`submitted`/null), `courseId`, `leaderId`. No weight field; `maxMarks` only. |
| Announcements | `/announcements` | 217; HTML body, `attachments[]` with signed GCS URLs (PDFs), audience program/course/all |
| Events (sessions, masterclasses, exams, activities) | `/events/my` | 259; `eventType` session/event/masterclass/exam, `startAt`/`endAt` (UTC), `courseName`, room, meetingLink |
| Notifications | `/notifications` | `items[]`, `hasMore`, `unread` (pagination params not yet explored) |
| Attendance | `/attendance/student/summary` | per course attended/total/% and participation points |
| Startup Leader weeks | `/startup-leaders/student/weeks` | programName, weekNumber, startsOn/endsOn |
| Readiness (MRS) | `/mrs/assessments`, `/mrs/assessments/baseline` | |
| Banners | `/banners/student` | |
| Coach scenarios | `/coach/scenarios` | currently empty / not visible |
| Courses | **not found** | `/courses`, `/courses/my` 404. Course names currently come from `events.courseName`. Course pages (`/student/lms/courses`) are RSC; real endpoint still to find. |

## Not reached / unknown
- Course materials, class notes/slides, pre-reads, grading rubrics, grades: no endpoint seen yet (only assignment `materials[]`
  links and announcement attachments). Need to open a course page and an assignment detail page in the headed browser and capture their calls.
- Assignment weights/rubrics: likely inside description/instructions HTML or attached PDFs; to verify.
- Holidays/academic calendar: probably inside `/events/my`; to verify.
- Notification pagination; `/assignments/{id}` detail endpoint.

## Terms and rate limits
No terms of use or rate-limit headers seen. The user should confirm MESA allows automated access to their own account.
Client policy: 1.5s between requests, sequential, ETag/hash caching, GET only.

## Sensitive data
Raw probe responses are in `data/discovery/` (gitignored). Attachment URLs are signed and expire.
