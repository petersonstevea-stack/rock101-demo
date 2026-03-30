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

### Step 1.6 — Design and Create method_lessons Table
- Review `data/methodLessons.ts` structure (~1100 lines)
- Design `method_lessons` table schema
- Write and run migration SQL in Supabase
- Write seeding script to populate from local file
- Verify data in Supabase
- Delete `data/methodLessons.ts`

### ✅ Step 1.7 — Design and Create Curriculum Structure Table(s)
Seeding complete. Three tables created and populated:
- `rock101_graduation_requirements` — 49 rows
- `rock101_rehearsal_behaviors` — 6 rows
- `rock101_method_lesson_months` — 155 rows

`data/methodLessons.ts` deletion is blocked — still imported by `data/rock101Curriculum.ts`.
`data/rock101Curriculum.ts` deletion is blocked — 6 active callers still read from it at runtime.
Both files can only be deleted after Step 1.7b is complete.

### Step 1.7b — Migrate Curriculum Callers to Supabase
Before `data/rock101Curriculum.ts` (and `data/methodLessons.ts`) can be deleted,
the following 6 files must be rewritten to query the new Supabase tables instead:

- `components/Rock101App.tsx`
- `components/CertificateView.tsx` — uses `getPrivateLessonSections`, `getGroupRehearsalSections`
- `components/GraduationRequirementsView.tsx` — uses `getAllCurriculumItems`, `ROCK101_MONTH_LABELS`
- `components/GroupRehearsalView.tsx` — uses curriculum data
- `components/PrivateLessonView.tsx` — uses curriculum data
- `lib/progress.ts` — uses `getAllCurriculumItems`, `getGroupRehearsalSections`, `getPrivateLessonSections`

After all 6 are migrated: delete `data/rock101Curriculum.ts` and `data/methodLessons.ts`.

### Step 1.8 — Delete Superseded Local Data Files
After confirming Supabase has all data:
- Delete `data/students.ts`
- Delete `data/users.ts`
- Delete `data/schools.ts`

### Step 1.9 — Evaluate Static Reference Data
Decide which of these become DB-managed vs remain static config:
- `data/songLibrary.ts`
- `data/curriculum.ts`
- `data/reference/enrollmentOptions.ts`
- `data/reference/classGroupOptions.ts`

### Step 1.10 — Remove Legacy Director Role References
- Audit all "director" role checks and UI labels
- Replace with assignment-based logic (Show Director = staff assigned to session)
- Clean up `components/Rock101App.tsx` `defaultCurriculumState` hardcoded fallback

---

### Known Bugs — Fix Before Pilot Launch
- **ClassSetupView student picker:** Shows all students as available even if
  already enrolled in another class. Filter out students whose name appears
  in `studentNames` of any existing `rock_classes` record.
- **staff_school_roles gap:** Any new staff member created through the UI must
  also get a corresponding `staff_school_roles` row or RLS will block all their
  data. The staff creation flow needs to INSERT into `staff_school_roles`
  automatically when a new staff record is created.

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

Current status: workflow state exists in `students.workflow`
(`instructorSubmitted`, `directorSubmitted`) but the Send to Parent
trigger is not appearing correctly after both submit.

Fix before pilot launch.

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
