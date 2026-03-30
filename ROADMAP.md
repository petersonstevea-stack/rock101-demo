# ROADMAP.md — Stage Ready Build Phases
## What to build, in what order, starting from today.

---

## Current Status
- Rock 101 pilot: ~85% complete with real students and schools
- Performance Program: schema partially exists, UI not started
- All other programs: future phase only

---

## PHASE 1 — Rock 101 Stabilization (In Progress)
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

### Step 1.13 — Rename fistBumps to highFives
- Rename `fistBumps` → `highFives` in all TypeScript types, component references, and jsonb key names
- Requires data migration on `students.curriculum` jsonb to rename the key in all existing records
- Do after Phase 1 is otherwise complete

---

### Known Bugs — Fix Before Pilot Launch
- ✅ **ClassSetupView student picker:** Fixed. Students already enrolled in another class are filtered out of the picker. When editing an existing class, that class's own students remain available.
- ✅ **staff_school_roles gap:** Fixed. Both `app/enrollment/staff/page.tsx` and `app/enrollment/page.tsx` now auto-insert a `staff_school_roles` row immediately after a successful staff INSERT. SSR failure is logged but non-blocking — staff record takes priority.

---

### UI Design Review — Do Before Pilot Launch
**Goal:** Improve aesthetics and usability across all student-facing views.

- Student Dashboard — improve overall layout and visual appeal
- Private Lesson page — redesign for clarity and invitation
- Graduation Requirements page — redesign for clarity
- Group Rehearsal page — redesign for clarity
- Badges section — hide from UI for now, evaluate later
  whether to keep or remove permanently
- Rock 101 song library — audit and update song list
- General UI polish pass across all views

---

### Parent Email Workflow — Restore Before Pilot Launch
**Goal:** Restore the two-staff weekly feedback → parent email flow.

How it should work:
1. Instructor saves weekly lesson notes and progress → marked submitted
2. Director saves weekly group rehearsal notes → marked submitted
3. After BOTH have submitted, a "Send to Parent" prompt appears
   for the second staff member who saved
4. Clicking send emails the parent the full completed dashboard

**Frontend fixes complete (commit 248ca81):**
- `workflowReady` condition fixed — no longer requires graduation signoffs
- `workflowMissingMessage` simplified — only checks instructor + class instructor submitted
- `parentSubmitted: true` now persisted to Supabase after successful email send
- Debug `console.log` and `alert("BUTTON CLICKED")` removed from `WorkflowBanner`

**Edge function built, not yet deployed (commit ec80643):**
- `supabase/functions/send-parent-update/index.ts` created — sends HTML email via Resend
- `RESEND_API_KEY` must be set in Supabase Dashboard → Edge Functions → Secrets
- Deployment blocked pending Resend domain verification for `rock101stageready.com`
  (DNS propagation in progress — check Resend dashboard to confirm `Verified` status)

**Next steps once domain shows Verified in Resend:**
1. Deploy: `supabase functions deploy send-parent-update`
2. Test end to end with a real student record

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

---

## PHASE 2 — Performance Program Build
**Goal:** Build the show production and casting UI on top of the existing schema.

### Step 2.1 — Show Group Builder
- Create/edit show group instances (school + season + year + theme + venue)
- Show Theme Type → filtered Show Theme selection flow
- Show Director assignment (any staff member)

### Step 2.2 — Student Membership
- Add/remove students from a show group
- Support multiple show groups per student
- Membership status tracking

### Step 2.3 — Setlist Builder
- Add songs to a show group
- Set order, tuning, capo, notes per song

### Step 2.4 — Casting Tool
- Grid-style casting UI per song
- Cast slots: drums, bass, guitar 1/2/3, keys, lead vocals, backing vocals, auxiliary
- Multi-student backing vocals (no cap)
- Understudies stored relationally per slot
- Auxiliary slots with custom label

### Step 2.5 — Show Dashboard
- School-level view of active shows
- Songs fully cast vs incomplete
- Student load across songs
- Performance date and venue display

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

## General Rules for All Phases
- One step at a time — stop and confirm after each
- Git commit before every structural change
- Never delete a working file until its replacement is confirmed live
- Explain every change in plain English before writing code
