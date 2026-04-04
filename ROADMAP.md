# ROADMAP.md — Stage Ready Build Phases
## What to build, in what order, starting from today.

---

## Current Status
- **Phase 1 — Rock 101 Stabilization: ✅ COMPLETE (April 2026)**
- **Phase 2 — Performance Program: ✅ COMPLETE (April 2026)**
- **Phase 7 — Pike13 Integration: ✅ COMPLETE (April 2026)**
- Rock 101 pilot: live and functional with real students and schools — enrollment, progress tracking, parent email flow all operational
- Performance Program: casting, rehearsal, My Casting, PP Private Lesson all live — Pike13 owns rosters and scheduling
- Pike13 SSO live for staff; nightly sync running; classes and sessions synced
- Phase 3 (Navigation & Student Experience): 🔜 not started
- All other programs: future phase only

---

## ✅ PHASE 1 — Rock 101 Stabilization (Complete — April 2026)
**Goal:** Make Supabase the single source of truth. No localStorage. No Redis. No local data files.

### ✅ Step 1.1 — Git Checkpoint
Complete. Clean commit established as rollback point.

### ✅ Step 1.2 — Eliminate localStorage (classes)
Complete. `lib/classes.ts` and `ClassSetupView.tsx` write to `rock_classes` table only.

### ✅ Step 1.3 — Eliminate localStorage (users/session)
Complete. `lib/session.ts` cleaned — all localStorage-backed user functions deleted.
`DirectorAccountsView` removed (localStorage prototype, superseded by Manage Staff and Manage Families).
Only remaining localStorage in session.ts: tab preference state (intentional).

### ✅ Step 1.4 — Eliminate localStorage (student progress)
Complete. `data/studentProgress.ts`, `RequiredLessonsChecklist.tsx`, and `ParentWeeklyReview.tsx`
deleted — all were orphaned localStorage code never connected to the live Supabase system.
`students.curriculum` jsonb in Supabase is and was the live system.

### ✅ Step 1.5 — Eliminate Redis
Complete. Broken API route deleted (`app/api/student-progress/[studentId/rout.ts` —
had two typos, was never reachable). `@vercel/kv` dependency removed.

### ✅ Step 1.6 — Design and Create method_lessons Table
Complete. `method_lessons` table created and seeded with 155 rows from `data/methodLessons.ts`.
Deletion of `data/methodLessons.ts` blocked until Step 1.7b is complete (co-dependent with `rock101Curriculum.ts`).

### ✅ Step 1.7 — Design and Create Curriculum Structure Table(s)
Seeding complete. Three tables created and populated:
- `rock101_graduation_requirements` — 49 rows
- `rock101_rehearsal_behaviors` — 6 rows
- `rock101_method_lesson_months` — 155 rows

`data/methodLessons.ts` deletion is blocked — still imported by `data/rock101Curriculum.ts`.
`data/rock101Curriculum.ts` deletion is blocked — 6 active callers still read from it at runtime.
Both files can only be deleted after Step 1.7b is complete.

### ✅ Step 1.7b — Migrate Curriculum Callers to Supabase
Complete. All 6 direct callers and 3 indirect callers migrated to `lib/curriculumQueries.ts`.
`data/rock101Curriculum.ts` and `data/methodLessons.ts` deleted. Build is clean.

Migrated files:
- `components/Rock101App.tsx`
- `components/CertificateView.tsx`
- `components/GraduationRequirementsView.tsx`
- `components/GroupRehearsalView.tsx`
- `components/PrivateLessonView.tsx`
- `lib/progress.ts`
- `components/RoleShell.tsx` — dead code, minimal fix only
- `components/PipelineView.tsx`
- `components/BandsDashboard.tsx`

**Note — method_lesson_programs junction table:**
This junction table (linking `method_lessons` to `programs`) needs to be created and seeded,
but is blocked until the `programs` table primary key type is confirmed. Do not seed until confirmed.

### ✅ Step 1.8 — Delete Superseded Local Data Files
Complete:
- ✅ `data/students.ts` — deleted (superseded by Supabase `students` table)
- ✅ `data/users.ts` — deleted (superseded by Supabase `staff`/`users` tables)
- ✅ `data/schools.ts` — deleted; all 6 callers migrated to live `schools` Supabase query; `SchoolId` type replaced with `string` throughout

### 🔶 Step 1.9 — Evaluate Static Reference Data
Partially complete — school-specific data removed; instrument/program/role config intentionally kept static:
- ✅ `data/curriculum.ts` — deleted (orphaned dead code, zero callers)
- ✅ `data/reference/classGroupOptions.ts` — deleted; replaced with live `rock_classes` query in `app/enrollment/page.tsx`
- ✅ `data/schools.ts` — deleted; see Step 1.8
- ✅ Slug format mismatch fixed: `enrollmentOptions.ts` corrected from underscore to hyphen format to match live database values
- ✅ `data/reference/enrollmentOptions.ts` — school-specific parts removed: `SchoolSlug` type, `SCHOOL_OPTIONS` constant, and `getSchoolLabel` function deleted; all callers replaced with live Supabase `schoolList` lookups; remaining content (instruments, programs, roles, school types) is stable system config that can remain static long-term

Intentionally deferred to Phase 2:
- 🔜 `data/songLibrary.ts` — 1 caller (`ClassSetupView`); approved songs list is hardcoded; should become DB-managed (target: `songs` table per ARCHITECTURE.md); deferred — not blocking pilot

### ✅ Step 1.10 — Remove Legacy Director Role References
Complete:
- All UI labels updated: "Director" → "Class Instructor" across `ClassDetailView`, `ClassSetupView`, `ClassSelectorView`, `GraduationRequirementsView`, `NotesPanel`, `WorkflowBanner`, `CertificateView`, `Rock101App`, `lib/roles.ts`, `lib/progress.ts`
- Class Director assignment dropdown now shows all staff at the school, not just role === "director"
- Variable names, function names, role value strings, permission logic, and workflow field names left unchanged

⚠️ Role value rename (`director` → `music_director`, `gm` → `general_manager`) remains future work — blocked on RLS policy updates. Do not rename until all RLS policies and role checks in code are updated to use new values first.

### ✅ Step 1.11 — Migrate Song Readiness to Session-Level Tables
Complete:
- `session_song_readiness` table created — individual student grade per song per session
- `session_group_song_readiness` table created — whole-class grade per song per session
- Both tables use `song_name text` for now; `song_id` foreign key to be added in Phase 2 when `songs` table is built
- `rock_classes.song_progress` jsonb blob superseded — existing test data discarded, new tables are the system of record going forward
- `rock_classes.song_progress` column left in place until new UI is writing to new tables successfully

### ✅ Step 1.12 — Add required_high_fives to Rehearsal Behaviors
Complete. `required_high_fives` integer column added to `rock101_rehearsal_behaviors` table with `DEFAULT 10`. Per-behavior threshold is now configurable without a code change.

### ✅ Step 1.13 — Rename fistBumps to highFives
Complete. `fistBumps` → `highFives` renamed in all TypeScript types, component references, and jsonb field reads/writes across 15 files. DB migration completed prior to code update.

### ✅ Step 1.13b — Rename directorSubmitted to classInstructorSubmitted
Complete. `directorSubmitted` → `classInstructorSubmitted` renamed across all TypeScript types and component references (10 files). `graduationDirectorSubmitted` left unchanged. DB migration completed prior to code update.

### ✅ Step 1.14 — Enrollment RLS Fix
Complete. Student INSERT was failing because the RLS policy checks `school_id` but the enrollment form payload only set the legacy `school` field. Fixed: `school_id` and `primary_instructor_user_id` now included in the student INSERT payload in `app/enrollment/page.tsx`.

### ✅ Step 1.15 — Parent Email: Full Dashboard Snapshot
Complete. `send-parent-update` edge function rebuilt (v22). Now:
- Accepts `studentId` only — queries all data server-side using the service role key
- 4-tile stats row matching the dashboard exactly
  (Method App Lessons, Graduation Reqs, Group Rehearsal, High Fives)
- Show countdown with rehearsals remaining (calculated from
  `day_of_week` + `performance_date`, not logged sessions)
- Completed This Week — signed method lessons only, no raw IDs
- Private lesson progress by month (signed status per lesson)
- Group rehearsal notes
- Rehearsal behaviors with high fives progress bars
- Song readiness
- Graduation requirements by month
- Automatically reflects dashboard structure — update the edge
  function when dashboard layout changes

### ✅ Step 1.16 — Pike 13 Schema Prep
Complete. 7 linking fields and 6 indexes added across 6 tables:
- `students.pike13_person_id`
- `staff.pike13_person_id`
- `parents.pike13_person_id`
- `schools.pike13_subdomain`
- `rock_classes.pike13_service_id`
- `rock_classes.program_id` (FK → `programs.id`)
- `class_sessions.pike13_event_occurrence_id`
All nullable, additive, zero impact on existing data.
Migration: `supabase/migrations/20260331093238_add_pike13_linking_fields.sql`

### ✅ Step 1.17 — Parent Email Polish Pass
Complete. Email design polish deferred by decision — email is functional, sends correct data,
and is sufficient for the pilot. Full design polish (visual hierarchy, mobile layout, summary
layout) is intentionally deferred to a future pass after pilot feedback. Marking complete to
close Phase 1.

### ✅ Step 1.18 — Session-Level Sign-off and Attendance Table
Prerequisite for the execution dashboard. Current sign-off data
lives in `students.workflow` as a flat boolean blob with no session
anchor. Cannot support per-session accountability or absence
tracking without a proper relational record.

New table: `session_student_signoffs`
- `session_id` (FK → `class_sessions`)
- `student_id` (FK → `students`)
- `private_lesson_absent` boolean DEFAULT false
- `group_class_absent` boolean DEFAULT false
- `instructor_submitted` boolean DEFAULT false
- `instructor_submitted_at` timestamptz
- `instructor_submitted_by` uuid
- `class_instructor_submitted` boolean DEFAULT false
- `class_instructor_submitted_at` timestamptz
- `class_instructor_submitted_by` uuid
- `parent_email_sent` boolean DEFAULT false
- `parent_email_sent_at` timestamptz
- UNIQUE(`session_id`, `student_id`)

Migration approach:
- Add the table (additive — do not delete `students.workflow` yet)
- Update Rock101App sign-off writes to write to BOTH
  `session_student_signoffs` AND `students.workflow` during transition
- `students.workflow` booleans become legacy once execution
  dashboard is live and reading from the new table
- Do not remove `students.workflow` until full cutover is confirmed

Complete. session_student_signoffs table was already created via
migration. Two dual-write paths now active:
- ClassDetailView writes class_instructor_submitted on group
  class submission (was already done)
- Rock101App.handleSaveFeedback now writes instructor_submitted
  when roleType === "instructor", anchored to the current week's
  class_sessions record for the student's enrolled class
- PrivateLessonView now displays enrolled class name and class
  instructor name as context
- students.workflow writes preserved during transition period

### ✅ Step 1.19 — Weekly Execution Dashboard (Management View)
Complete. Execution Dashboard reads from session_student_signoffs, filtered to students with sessions this week.

### ✅ Step 1.21 — Session instructor override + Schedule view
Depends on: class_sessions.instructor_override_user_id column
(already added via migration).

Two features shipped together:

1. Session instructor override on class detail page
   - "Change instructor for this session" control below hero
   - Dropdown of school staff, saves to
     instructor_override_user_id on class_sessions
   - Hero meta line reflects override instructor name
   - "Use class default" option resets to null
   - Owner/director roles only

2. Schedule view page
   - New "Schedule" nav item under School section
   - Shows all future sessions for all school classes,
     grouped by week, 12 weeks at a time
   - Each row: date, class name, time, instructor
     (override ?? class default ?? "Not assigned")
   - Inline [Change] button to assign coverage per session
   - Purpose: vacation coverage planning until Pike 13
     integration takes over scheduling

Instructor display logic (standard across all views):
  instructor_override_user_id → staff name
  ?? director_user_id → staff name
  ?? "Not assigned"

Complete. Both features shipped:
- Session instructor override on ClassDetailView — scope prompt
  (just this session / all remaining), saves to
  instructor_override_user_id on class_sessions, hero reflects
  override name, resets to null with "Use class default"
- ScheduleView — all future sessions grouped by week, 12 weeks
  at a time, inline Change button with scope prompt, instructor
  display follows override ?? class default ?? "Not assigned"
- instructor_override_user_id column confirmed on class_sessions

### ✅ Step 1.22 — Private lesson session awareness
Complete. `private_lesson_enrollments` and `private_lesson_sessions` tables built and live.
Enrollment management (Lesson Setup) and session management (Manage Lessons) fully operational:
- Create recurring (104 sessions) and single-session enrollments
- Makeup flag on single sessions
- Per-session reschedule, instructor override, and cancel with scope prompt
- Session view grouped by student across all enrollments with merged session list
- `is_single_session`, `is_makeup`, `rescheduled_from` schema columns in place
Full Pike 13 anchor (occurrence IDs) remains deferred to Phase 6 as originally planned.

### 🔜 UI Polish Items
- ✅ Show logged-in user name in the sidebar — confirmed live. User name displays below the role badge in AppShell.tsx.
- My Schedule: tapping a lesson card should navigate to that student's Private Lesson page.
- My Schedule: My Classes section needs to be wired up to show group class sessions for the instructor.
- Exceptions Dashboard: absent students should be exempted from the waiting status when group_class_absent = true on session_student_signoffs.
- 🔜 Navigation bugs — fix back/forward navigation between My Schedule, Classes, and student views. When navigating from My Schedule to a class or student and back, the app should return to My Schedule not drop to an unexpected state. Audit all handleSetTab and setSelectedClassId calls that originate from MyScheduleView.
- 🔜 Class roster and session management outside of weekly view — Classes view only shows classes with a session this week (intentional for weekly execution). Classes with no session this week are invisible, making their rosters and future sessions unmanageable. Need a way to view and edit ALL classes regardless of session schedule — add/remove students, edit class details, and manage future session instances (cancel, reschedule, change instructor). This is the Stage Ready-managed equivalent of what Pike 13 will eventually own in Phase 6. Until Pike 13 integration is live, staff need to be able to manage this directly in Stage Ready. Class Setup is the current workaround but is not sufficient for session-level management.
- 🔜 LessonSetupView + ClassSetupView: Remove program selector from both setup forms — program is set once at student enrollment time (via Pike13 or manual entry) and should be read automatically from students.program. It should never be re-selected when setting up a class or a lesson. Update both forms to auto-populate program from the selected student record instead of presenting a dropdown.

---

### Known Bugs — Fix Before Pilot Launch
- ✅ **ClassSetupView student picker:** Fixed. Students already enrolled in another class are filtered out of the picker. When editing an existing class, that class's own students remain available.
- ✅ **staff_school_roles gap:** Fixed. Both `app/enrollment/staff/page.tsx` and `app/enrollment/page.tsx` now auto-insert a `staff_school_roles` row immediately after a successful staff INSERT. SSR failure is logged but non-blocking — staff record takes priority.
- ✅ **School selector bug:** Fixed. Owners can now select a school from a dropdown in the sidebar Location block. Selection updates `selectedSchoolId`, which flows through `effectiveSchoolFilter` to student and class data fetches.

---

### UI Design Review — Do Before Pilot Launch
**Goal:** Improve aesthetics and usability across all student-facing views.

- ✅ Student Dashboard — redesigned with white page background, dark solid-color tiles (#111111/#cc0000), squared edges, solid fills throughout (no gradients), stat tiles, progress rows, notes cards with red left border
- ✅ Sidebar nav — matches Method App style: pure black background, white nav items, red active state (full block), role badge (white card), Location/Viewing context blocks
- ✅ Badges section — hidden from UI; evaluate later whether to keep or remove permanently
- ✅ Private Lesson page — white background, solid dark tiles, squared edges, brand red progress bars and sign buttons, two-column checklist layout
- ✅ Graduation Requirements page — white background, solid dark tiles, squared edges, workflow signoff block, brand red buttons and progress bars
- ✅ Group Rehearsal page — white background, solid dark tiles, squared edges, rectangular song readiness sliders with red fill, brand red High Fives and sign buttons
- ✅ Rock 101 song library — audit and update song list
- 🔜 General UI polish pass across all views

---

### ✅ Parent Email Workflow — Complete
**Goal:** Two-staff weekly feedback → parent email flow. ✅ Live.

How it works:
1. Instructor saves weekly lesson notes and progress → marked submitted
2. Class Instructor saves weekly group rehearsal notes → marked submitted
3. After BOTH have submitted, a "Send to Parent" prompt appears
   for the second staff member who saved
4. Clicking send emails the parent the full completed dashboard

**Complete as of March 2026:**
- `workflowReady` condition checks `instructorSubmitted && classInstructorSubmitted`
- `parentSubmitted: true` persisted to Supabase after successful email send
- Edge function deployed (v22) — queries all data server-side from `studentId`
- Resend domain `rock101stageready.com` verified
- `RESEND_API_KEY` set in Supabase Edge Functions secrets
- See Step 1.15 for full edge function feature list
- See Step 1.17 for deferred polish work

---

### Profile Pages — Phased Build
**Goal:** Give staff and students their own profile pages.

**Phase A — Instructor Profile Page (build soon)**
- Each instructor has a profile page showing their info,
  assigned students, and school
- Accessible to the instructor themselves and to owners/GMs

**Phase B — Student Profile Page (Performance Program phase only)**
- Student profile page scoped to Performance Program students
- Not needed for Rock 101 pilot

**Phase C — Platform Vision (long term)**
- The platform should eventually feel like one TV set with
  multiple channels but the same remote control
- Each program (Rock 101, Performance, Little Wing, Rookies)
  is a channel — consistent navigation and design language
  across all of them
- Do not build for this yet — keep it in mind for every
  UI decision made today

### Staff Profile — Future Work
- Staff profile photo upload via Supabase Storage (currently URL input only)
- Parent-visible instructor profiles (requires privacy audit before going live)
- Student profile pages (Performance Program phase only — see Phase B above)
- Privacy & Security deep dive (required before any parent-facing profiles go live):
  - Minor data protection review
  - RLS audit on `staff` profile columns
  - Photo consent tracking
  - Data retention policy

---

## 🔄 PHASE 2 — Performance Program
**Goal:** Build the full Performance Program workflow from show group setup through student casting and My Casting page.

### ✅ Step 2.1 — Delete dead performance scaffolding
(features/performance/, app/performance/, Shows Overview.tsx)

### ✅ Step 2.2 — Show Group Setup (ShowGroupSetupView)
Owner/GM/MD can create and manage show groups.
Includes season, theme type, theme selection, scheduling, rehearsal rooms, and instructor assignment.

### ✅ Step 2.3 — Student Enrollment
Roster tab inside ShowGroupSetupView. Add/remove Performance Program students from a show group via show_group_student_memberships.

### ✅ Step 2.4 — Casting Tool
CastingView built in two parts:
2.4a — Song management: theme song import, slot editor, room assignment, paired display model (Black Flag → Abbey Road alternating pattern), pair color coding.
2.4b — Student assignment, paired conflict detection, casting equity panel, submission workflow, MD approval.
allStudents query updated to load across all programs — Rock 101 and Performance Program instructors are the same staff.
Full spreadsheet grid: fixed room columns alternating by position (Black Flag/Abbey Road), implicit pairing by proximity, standard slot columns, persistence fixed (delete-then-insert with correct status value), casting equity panel, submission and MD approval workflow complete.

### ✅ Owner school selection fix
Auto-selects school on login, sidebar selector aligned, view reset fixed.

### ✅ Step 2.5 — Casting Approval View
Built as part of Step 2.4 — MD approval section inside CastingView.
Music Director sees submitted casting, can approve or return with notes.
Approve → students see assignments on My Casting page.
Return with notes → back to instructor.

### ✅ Step 2.6 — My Casting Page (student/parent)
MyCastingView: student picker, approved assignments by show group, dual role badges, Method App exercise links with part labels, prerequisite exercise chips. Exercise data matched by song title + instrument from method_app_exercises table. Test record live: Stairway to Heaven vocals, exercise 5375.

### 🔜 Method App exercise data import
Awaiting CSV from SOR: Song Title | Artist | Instrument | Part Label | Exercise ID
Schema ready: method_app_exercises + method_app_exercise_prerequisites tables in place.
Once data arrives: bulk match on title+artist, update has_method_lesson = true for matched songs, surface links on My Casting page.

### ✅ Step 2.7 — Weekly Rehearsal View (Performance)
PerformanceRehearsalView: show group selector, date-based session management, attendance tracking (present/late/absent/excused), song priority with auto-suggest (new songs + lowest prior grade), readiness grades 1-4, weekly awards (instructor awards + peer nominations with approval flow), casting lock/unlock for GM/MD/owner with reason tracking and audit trail.

### ✅ Step 2.8 — Pike13 Enrollment Sync (Complete)
Nightly sync populates rock_classes.student_ids
from Pike13 visits endpoint. show_group_instances
and show_group_student_memberships auto-populated
from rock_classes. Pike13 is source of truth for
all show group rosters.

---

## 🔜 PHASE 3 — Navigation & Student Experience
**Goal:** Restructure navigation for Performance Program context and build a dedicated student-facing experience.

### 🔜 Step 3.1 — Navigation restructure
Nest Performance Program navigation contextually:
- Show Groups becomes the top-level Performance Program entry
- Casting, Rehearsal, and My Casting nest under their respective show group (selected show group drives context)
- Consider a Performance Program "hub" page that shows all show groups and clicking one sets context for all sub-navigation
- Class Roster, Class Setup, Lesson Setup, Manage Lessons could similarly nest under a Rock 101 hub
- Bands and Pipeline nav items need to be evaluated — currently placeholders

### 🔜 Step 3.2 — Student login experience
Students currently see the same nav as staff. Build a dedicated student-facing experience:
- Landing page: My Casting (Performance) + My Progress (Rock 101) in one view
- Simplified nav: Dashboard, My Casting, My Progress, My Profile only
- No access to school management tools
- Parent experience: same simplified view but for their linked student(s)
- Casting change notifications surfaced prominently
- Method App links front and center

---

## PHASE 4 — Platform Hardening
**Goal:** Prepare for multi-school scale and franchisor oversight.

### Step 4.1 — School Hierarchy Fields
- Add franchise and corporate hierarchy slugs to `schools` table
- Backfill existing schools

### Step 4.2 — Role + Scope Permission System
- Implement full role + scope permission checks
- Multi-school views for Franchise Owners and District Managers
- System-wide view for Franchisor Admin

### Step 4.3 — Reporting Foundations
- School-level reporting
- Multi-school reporting
- Show and casting reports

---

## PHASE 5 — Future Programs (Little Wing, Rookies, Summer Camps)
**Goal:** Build remaining program delivery engines.
- See `ARCHITECTURE.md` for full design of each program
- Do not start until Phase 1 and 2 are complete and stable

---

## PHASE 6 — Parent Dashboard + Student Login
- Rock 101 milestone visibility for parents
- Broader program visibility
- Student login (future — do not block in data model)

### 🔜 Dual-Role Staff/Parent Accounts
Some owners and staff are also parents of
enrolled students and may use the same Pike13
login for both roles. When a staff member's
email matches a students.parent_email, surface
a "Parent View" option in the staff shell sidebar
that switches context to the student selector
and student-facing shell. A "Back to Staff"
button returns to the staff shell.

Implementation notes:
- Check parent_email match on staff login
- parentMode state in Rock101App toggles shell
- No separate login required — same session
- Currently not needed: Steve Peterson uses
  separate emails for staff (speterson@schoolofrock.com)
  and parent (steve@loudchannel.com) roles

---

## PHASE 7 — Pike13 Integration

Pike13 is the enrollment and lesson/group management
engine for all School of Rock locations. Stage Ready
treats Pike13 as the source of truth for student
enrollment, staff rosters, and scheduling. Stage Ready
owns curriculum progress, casting, and parent
communications.

### Architecture Principles
- Pike13 = source of truth for who is enrolled and in what program
- Stage Ready = source of truth for curriculum progress, casting, and parent comms
- Email is the linking key between both systems
- Program detection uses case-insensitive keyword matching on Pike13 service names — designed to work across all 437 schools even if service names vary slightly

### Program Detection Rules (service name keywords)
- performance_program: "seasonal", "show rehearsal", "house band"
- rock_101: "rock 101", "r101"
- rookies: "rookies"
- little_wing: "little wing"
- adult_band: "adult"
- lessons_only: lessons with no program rehearsal
- exclude: "camp", "workshop", "trial", "make up", "admin", "birthday", "repair"

### ✅ Step 7.1 — OAuth2 Token (Complete)
Pike13 OAuth2 app registered. Permanent access token obtained via authorization code flow and stored in:
- .env.local (local dev)
- Vercel environment variables (production)
- Supabase Edge Function secrets (edge functions)

Token is owner-scoped, does not expire.
Callback route: /api/auth/pike13/callback

### ✅ Step 7.2 — Staff Sync (Complete)
Dry-run and commit endpoints built.
- /api/pike13/sync-staff (dry run)
- /api/pike13/sync-staff/commit (write)

Matches on email (case-insensitive). Updates pike13_person_id and pike13_role on existing staff records. Does not create new staff records — Stage Ready controls who gets access. System accounts excluded by email pattern. pike13_role column added to staff table.

### ✅ Step 7.3 — Student Sync (Complete)
Two-pass architecture:
- Pass 1: Enrollments Reporting API → active person IDs with program detection via service name keywords
- Pass 2: Core API batch lookup → client details (guardian_email, instrument, name)

Endpoints:
- /api/pike13/sync-students (dry run)
- /api/pike13/sync-students/commit (write, upsert-safe)

183 Del Mar students imported across 6 program buckets. Unique constraint on students.pike13_person_id ensures idempotent re-runs.

### ✅ Step 7.4 — Nightly Sync Job (Complete)
Supabase Edge Function `pike13-nightly-sync`
deployed. pg_cron scheduled at 2:00 AM UTC daily.
Runs student sync (two-pass) + staff sync.
Results logged to `pike13_sync_log` table.
183 students and 15 staff synced on first run.

### ✅ Step 7.5 — Pike13 OAuth Login / SSO (Complete)
Staff SSO live via Pike13 OAuth2.
- /api/auth/pike13/sso — initiates OAuth flow,
  reads pike13_subdomain from schools table
- /api/auth/pike13/callback — exchanges token,
  reads user email from /api/v2/front/people/me.json,
  looks up school via pike13_location_id, verifies
  staff_school_roles, generates Supabase magic link
- LoginScreen updated: "Sign in with Pike13" is
  primary button, email/password is fallback
- Multi-school routing: each school has
  pike13_subdomain and pike13_location_id in the
  schools table. Del Mar location_id: 35085.
  Encinitas and Scripps Ranch location_ids will
  auto-populate from Vercel logs on first SSO login.

### ✅ Step 7.6 — Class and Session Sync (Complete)
Three sync endpoints built and deployed:
- /api/pike13/sync-classes (dry run)
- /api/pike13/sync-classes/commit (write)
- /api/pike13/sync-rosters (dry run)
- /api/pike13/sync-rosters/commit (write)

11 Del Mar classes imported (5 Rock 101 + 6 PP).
66 sessions created with pike13_event_occurrence_id.
107 students enrolled in correct class groups via
Pike13 visits endpoint.
Class naming: "{Event Name} — {Day} {Time}" with
instructor tiebreaker for same-day/time conflicts.
Staff names from Pike13 occurrence data written to
rock_classes.staff_names (text array).

### ✅ Step 7.7 — Attendance Write-back (Deferred)
Pike13 handles attendance tracking well today.
Deferred indefinitely as a possible future
enhancement if schools request it.
Stage Ready tracks attendance internally for:
- Rock 101 group rehearsals (management exceptions)
- Private lessons (passive absence recording)
Performance Program group attendance: TBD.

---

---

## ✅ Completed — PP Parent/Student Shell
(April 4, 2026 continued)

### Student Selector
- Guitar swirl logo, STAGE READY branding
- Two cards per enrolled student with program label
- Routes to correct shell per program
- Sign out at bottom

### Performance Program Shell
- Separate visual shell for PP parents/students
- Black sidebar: guitar swirl logo, student name,
  4 nav tabs (My Casting, My Show, Private Lesson,
  Student Profile)
- Hero: STAGE READY white Oswald, Performance
  Program subtitle, student name
- ← Switch Student in sidebar (multi-child families)

### PP Shell — My Casting tab
- Renders MyCastingView with real cast assignments
- Parents can read students table via new RLS policy

### PP Shell — My Show tab
- Show group name, instructors, performance date
- Reads staff_names from show_group_instances
  (copied from rock_classes — avoids RLS conflict)
- Timezone-safe date rendering (T12:00:00)

### PP Shell — Private Lesson tab
- Renders PPPrivateLessonView

### PP Shell — Student Profile tab
- Fully built — see Student Profile Page below

### ✅ Student Profile Page
- StudentProfileView component built
- Circle avatar with blue season badge
  (count of approved completed shows)
- Blue glow ring = House Band (management set)
- Gold glow ring = All-Star (management set)
- Show History section — student submits show
  name + season/year → staff approves before
  appearing publicly. Badge count reflects
  pending + approved.
- Personality fields: Favorite Bands, First
  Concert, Fun Fact, Spotify URL, Apple Music
  URL — all go through pending review flow
- Edit Profile form → Submit for Review →
  pending_changes jsonb awaits staff approval
- Pending Review block shows submitted changes
  in view mode while awaiting approval
- Poster upload: students attach 11x17 show
  poster JPG/PNG to each show submission
- Poster collage wallpaper: approved show
  posters display flush edge-to-edge behind
  the profile header, building up as a collage
  over seasons
- Supabase Storage bucket: student-profiles
  (10MB limit, image types only, student can
  only write to their own folder)
- ALL student content (text, photos, wallpaper,
  posters) goes through pending review —
  nothing goes live without staff approval

### ✅ Student Profile — Schema
- student_profiles table: photo_url,
  wallpaper_url, wallpaper_preset,
  favorite_bands, first_concert, fun_fact,
  spotify_url, apple_music_url,
  pending_changes (jsonb), pending_status,
  pending_submitted_at, pending_reviewed_at,
  pending_reviewed_by, rejection_note,
  is_published
- student_show_history table: show_name,
  season_year, status (pending/approved/
  rejected), poster_url, pending_poster_url
- students.is_house_band and students.is_allstar
  boolean columns (management-set only)
- feature_student_profiles flag on schools table
  (schools opt in — default false)

### 🔜 Student Profile — Still To Build
- Management approval queue: staff review
  pending profile fields, show history
  submissions, and poster uploads. Approve
  or reject with optional note.
- Profile goes fully live after approval:
  pending_changes merged into live fields
- Photo upload: student uploads profile photo
  to Supabase Storage, goes through pending
  review before appearing on profile
- School-wide student directory: any logged-in
  student can browse other students' profiles
  at their school
- Dual-role staff/parent accounts: staff who
  are also parents (same Pike13 email) get a
  "Parent View" toggle in the staff shell

### 🔜 Pre-Launch Checklist
- Set feature_parent_sso = false on del-mar
  before opening to real parents
  (currently true for testing)
- Test SSO with non-owner staff account
- Capture Encinitas + Scripps Ranch
  pike13_location_id from Vercel logs on
  first staff SSO login from those schools
- Add instruments in Pike13 for 135 students
  missing instrument data (nightly sync will
  pick up automatically)
- Method App exercise CSV import (awaiting
  data from SOR)
- Remove test students before pilot launch:
  "Test PP S." and "Test R101 S." from
  steve@loudchannel.com parent account

### Test Accounts (do not delete until launch)
- Parent test: steve@loudchannel.com /
  TestParent2026!
  Students: Test PP S. (performance_program)
            Test R101 S. (rock_101)
- Staff: speterson@schoolofrock.com (owner)
- Pike13 SSO: works for all active Del Mar staff

### Parent SSO via Pike13
- SSO callback extended to check students.parent_email
  after staff check fails
- feature_parent_sso flag on schools table gates access
- Currently disabled (false) for all schools
- Metadata passes students array for multi-child routing

---

## ✅ Completed April 4, 2026

### Show Groups — Full Rebuild
- Show Groups is now the single hub for all
  Performance Program management
- Cards show: show group name, staff names (from
  Pike13), day/time, student count, SETUP CASTING
  or GO TO CASTING button
- SETUP CASTING appears when no casting template
  selected. GO TO CASTING when theme is linked.
- Edit Details form cleaned: schedule fields removed
  (Pike13 owns scheduling), class instructor removed
  (Pike13 owns staff), show date field added
- Casting auto-imports all 50 theme songs when a
  show group is opened for the first time
- 2-column grid layout
- ROSTER and SESSIONS tabs inline on each card
- Class Roster removed from nav — redundant
- Casting Equity section added below cards with
  lazy-loaded per-group equity panel
- Casting nav item removed — accessible only via
  GO TO CASTING button from Show Groups

### Admin — Rebuilt as Staff-Only Page
- Student and family management sections removed
- Pike13 owns all student/family data
- Admin now shows only: info banner + Manage Staff
- Manage Staff page rebuilt: no enrollment form,
  role dropdown only (instructor → music_director
  → general_manager → owner)
- Role changes write to both staff.role and
  staff_school_roles.role simultaneously
- Staff are synced from Pike13, default to instructor
- Legacy role values fixed: director → instructor,
  gm → general_manager throughout database
- Julian Quezada reactivated, Luke Sparrow promoted
  to music_director

### PP Private Lesson View
- PPPrivateLessonView component created
- Shows student casting from current show at top
- Three text areas: Lesson Notes, Music Theory
  Assignment, Method App Exercises
- No Show button releases instructor obligation
- Submit button locks all fields
- Auto-routes PP students to this view, R101
  students continue to existing PrivateLessonView

### Student Selector — Program Color Coding
- Rock 101 students: red (#cc0000) cards
- Performance Program students: dark (#1a1a1a) cards
- Program label shown on each card

---

## 🔜 Pending Tasks — Pre-Rollout

### SSO — Encinitas and Scripps Ranch location_ids
When a staff member from Encinitas or Scripps Ranch
first logs in via Pike13 SSO, their location_id
appears in Vercel function logs
(SSO: location_id=... email=...).
Capture and update:
  UPDATE schools SET pike13_location_id = [value]
  WHERE id = 'encinitas';
  UPDATE schools SET pike13_location_id = [value]
  WHERE id = 'scripps-ranch';

### Instrument data cleanup
135 of 183 Del Mar students have no instrument in
Pike13. Add instruments directly in Pike13 — the
nightly sync will pick them up automatically.
Do NOT add them in Stage Ready (will be overwritten).

### Method App exercise data import
Awaiting CSV from SOR:
  Song Title | Artist | Instrument | Part Label | Exercise ID
Schema ready: method_app_exercises +
method_app_exercise_prerequisites tables in place.

---

## General Rules for All Phases
- One step at a time — stop and confirm after each
- Git commit before every structural change
- Never delete a working file until its replacement is confirmed live
- Explain every change in plain English before writing code
