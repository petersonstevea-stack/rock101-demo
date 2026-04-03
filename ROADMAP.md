# ROADMAP.md — Stage Ready Build Phases
## What to build, in what order, starting from today.

---

## Current Status
- **Phase 1 — Rock 101 Stabilization: ✅ COMPLETE (April 2026)**
- Rock 101 pilot: live and functional with real students and schools — enrollment, progress tracking, parent email flow all operational
- Performance Program: schema partially exists, UI not started
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
- Show logged-in user name in the sidebar — currently only role badge shows. Add user's full name below the role badge in AppShell.tsx.
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

### ✅ Owner school selection fix
Auto-selects school on login, sidebar selector aligned, view reset fixed.

### 🔜 Step 2.5 — Casting Approval View
Music Director sees submitted casting for review.
Approve → students see on My Casting page.
Return with notes → back to instructor.

### 🔜 Step 2.6 — My Casting Page (student/parent)
Student sees their approved cast assignments.
Song title, artist, their role/instrument.
Method App link for songs with has_method_lesson = true.
Show date.

### 🔜 Step 2.7 — Weekly Rehearsal View (Performance)
Same pattern as Rock 101 weekly execution view.
Tonight's rehearsal agenda, attendance, per-song notes.

### 🔜 Step 2.8 — Pike13 enrollment sync
Replace manual student enrollment with Pike13 API.
Pike13 becomes source of truth for show group membership.
Stage Ready owns casting/progress/parent comms.

---

## PHASE 3 — Platform Hardening
**Goal:** Prepare for multi-school scale and franchisor oversight.

### Step 3.1 — School Hierarchy Fields
- Add franchise and corporate hierarchy slugs to `schools` table
- Backfill existing schools

### Step 3.2 — Role + Scope Permission System
- Implement full role + scope permission checks
- Multi-school views for Franchise Owners and District Managers
- System-wide view for Franchisor Admin

### Step 3.3 — Reporting Foundations
- School-level reporting
- Multi-school reporting
- Show and casting reports

---

## PHASE 4 — Future Programs (Little Wing, Rookies, Summer Camps)
**Goal:** Build remaining program delivery engines.
- See `ARCHITECTURE.md` for full design of each program
- Do not start until Phase 1 and 2 are complete and stable

---

## PHASE 5 — Parent Dashboard + Student Login
- Rock 101 milestone visibility for parents
- Broader program visibility
- Student login (future — do not block in data model)

---

## PHASE 6 — Pike 13 Integration
**Goal:** Connect Stage Ready to Pike 13 (School of Rock's school management system) for staff sync, schedule display, and attendance.

### Step 6.1 — Integration Spec (Design Before Building)

#### Staff Integration
- Staff enrollment should flow from Pike 13 — when a staff member is added in Pike 13, Stage Ready should auto-create their profile
- Pike 13 has 3 staff roles: Staff Member, Limited Staff Member, Manager — these do NOT map cleanly to Stage Ready roles (`owner`, `gm`, `director`, `instructor`)
- Stage Ready must be able to OVERRIDE Pike 13 role designations for its own permission purposes
  - Design: Pike 13 role stored as a reference field on the staff record; Stage Ready role is the authoritative value for all permission checks in this system
- Different schools may have the same staff member at different access levels — Stage Ready already supports this via the `staff_school_roles` table

#### Single Login Credential
- **Goal:** one login that works for both Pike 13 and Stage Ready
- Investigate whether Pike 13 OAuth2 can be used as the identity provider for Stage Ready login
- If the same email is used in both systems, Stage Ready can use Pike 13 email as the linking key
- This requires confirming Pike 13 email matches staff email in the Stage Ready `staff` table
- **Do not build yet** — investigate feasibility first

#### Schedule Display
- Stage Ready should be able to display a staff member's schedule pulled from Pike 13
- Show: upcoming classes, session times, assigned students per session
- Read-only from Pike 13 — Stage Ready does not write schedule data back to Pike 13

#### Attendance
- Stage Ready should be able to mark attendance for a class session
- Write attendance back to Pike 13 via Core API
- Also display a student's attendance history pulled from Pike 13 Reporting API
- Attendance data stays in Pike 13 as source of truth — Stage Ready displays and writes but does not store independently

#### Prerequisites to Confirm Before Building
1. Confirm `students` table primary key type in Supabase
2. Confirm how sessions currently identify the logged-in user
3. Confirm whether Pike 13 stores the same email your staff uses in Stage Ready
4. Investigate Pike 13 OAuth2 as identity provider
5. Confirm Pike 13 API supports attendance writes via Core API

---

## General Rules for All Phases
- One step at a time — stop and confirm after each
- Git commit before every structural change
- Never delete a working file until its replacement is confirmed live
- Explain every change in plain English before writing code
