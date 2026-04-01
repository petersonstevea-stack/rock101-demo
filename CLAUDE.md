<!-- DO NOT OVERWRITE THIS FILE — restore from git if blank: git checkout HEAD -- CLAUDE.md -->
# CLAUDE.md — Stage Ready / School of Rock LMS
## Project Briefing for Claude Code

---

## What This Project Is
A multi-school Learning Management System for School of Rock, called **Stage Ready**. Currently in active pilot with real students, staff, and schools. The platform manages student curriculum progress, class sessions, show/performance workflows, staff assignments, and parent communications across multiple school locations.

This is a **production-intent system**, not a demo. It must eventually support 400+ franchise schools and 40+ corporate schools. Every decision should be made with that scale in mind, even if we are only building for 3 schools today.

## Tech Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres + Auth)
- **Hosting:** Vercel
- **IDE:** VS Code

---

## Active Build Scope (Current Phase)
We are currently building two programs only:

1. **Rock 101** — pilot in progress, ~80% complete. Needs localStorage → Supabase cleanup before further feature work.
2. **Performance Program** — next major build, not yet started in UI. Schema partially exists in Supabase.

All other programs (Little Wing, Rookies, Summer Camps) are **future phase**. Read `ARCHITECTURE.md` for their design, but do not build them now.

---

## Role Hierarchy

### Per-School Roles
```
Owner (= Franchise Owner)
└── General Manager  (peer authority with Music Director)
└── Music Director   (peer authority with General Manager)
    └── Instructor
        └── Parent (login, no management)
            └── Student (no login — future phase may add student login)
```

### Actual Role Values in Database (use these exactly in RLS policies and role checks)
| Display Name | DB Value | Notes |
|---|---|---|
| Owner | `owner` | Franchise owner |
| General Manager | `gm` | Pending rename to `general_manager` |
| Music Director | `director` | Pending rename to `music_director` |
| Instructor | `instructor` | Stable |

### ⚠️ Pending Role Value Migration
The following `staff.role` values need to be renamed before going to multi-school production:
- `gm` → `general_manager`
- `director` → `music_director`

Do NOT run this migration until all RLS policies and role checks in the codebase have been updated to use the new values first. Current RLS policies use the old values (`gm`, `director`, `owner`).

### Critical Role Rules
- **The "Director" role has been eliminated.** Any references to a standalone "Director" role in the codebase are legacy and must be refactored out.
- **Show Director** is a *function*, not a role. Any staff member can be designated Show Director for a specific show group. It is an assignment, not a permission level.
- The term `director_user_id` in existing tables means "the staff member assigned to lead this show/class" — not a role check.
- Instructors can be assigned to **multiple schools** with different roles at each.
- A user logs in once, then selects which school context to enter if they belong to multiple schools.
- **Parents** are the only current family login accounts. Student login is planned for a future phase — do not permanently foreclose it in the data model.

### Platform-Level Roles (above school)
**Franchise:** International Franchise Rollup → Regional Franchise Leader → Franchise Group / Owner
**Corporate:** Corporate System Leader → Regional Manager → District Manager → Territory Manager

### Permission Model
Role alone is not enough — the system requires **role + scope**.
Scope examples: `global`, `franchise_rollup`, `franchise_region`, `franchise_group`, `corporate_region`, `corporate_district`, `corporate_territory`, `school`, `family`

---

## Current Database (33 tables in Supabase)

### Stable and Active
| Table | Notes |
|---|---|
| `students` | `curriculum` (jsonb) = per-student lesson progress. `workflow` (jsonb) = submission states |
| `staff` | Some legacy fields present — partial cleanup needed |
| `schools` | Simplified for pilot — hierarchy fields to be added post-pilot |
| `rock_classes` | Exists but writes partially go to localStorage — migration needed |
| `class_sessions` | Active |
| `programs` | Active |
| `program_enrollments` | Active — must support dual enrollment |
| `program_cycles` | Active |
| `organizations` | Active |
| `parents` / `parent_student_links` | Active |
| `staff_school_roles` / `user_school_roles` | Bridge tables — support multi-school, different roles per school |
| `user_program_permissions` / `user_scope_assignments` | Active |
| `roles` | Active |
| `shows` / `show_group_instances` / `show_group_songs` / `show_group_student_memberships` | Active — Performance Program tables |
| `show_song_cast_slots` / `show_song_cast_assignments` / `cast_slot_types` | Active — casting layer |
| `seasons` / `show_themes` / `show_theme_types` | Active |
| `waiver_templates` / `user_waiver_acceptances` | Active |
| `user_invites` | Active |

### Tables Still Needed
| Missing Table | Source | Priority |
|---|---|---|
| `method_lessons` | `data/methodLessons.ts` (~1100 lines) | HIGH |
| Curriculum structure table(s) | `data/rock101Curriculum.ts` (~1000 lines) | HIGH — design TBD |

---

## Known Migration Debt (Do This Before New Features)

### 1. Eliminate localStorage (HIGH — tables already exist)
| File | Problem | Target |
|---|---|---|
| `lib/classes.ts` | `saveClasses()` writes to localStorage | `rock_classes` table |
| `lib/session.ts` | `saveCreatedUsers()` / `findUserByEmail()` use localStorage | `staff` / `users` tables |
| `data/studentProgress.ts` | Lesson progress in localStorage | `students.curriculum` jsonb in Supabase |

### 2. Eliminate Redis (HIGH)
- `app/api/student-progress/[studentId]/route.ts` uses Upstash Redis
- Replace with direct reads/writes to `students.curriculum` in Supabase
- No real progress data exists yet — safe clean cutover

### 3. Seed Then Delete Local Data Files (HIGH)
| File | Status |
|---|---|
| `data/students.ts` | Superseded by real Supabase data — delete after confirming |
| `data/users.ts` | Superseded — delete after confirming |
| `data/schools.ts` | Superseded — delete after confirming |
| `data/methodLessons.ts` | Needs `method_lessons` table first, then seed and delete |
| `data/rock101Curriculum.ts` | Needs table design first, then seed and delete |

### 4. Remove Legacy "Director" Role References (MEDIUM)
- Search for role checks, UI labels, permission logic referencing "Director" as a role
- Replace with assignment-based logic
- Do NOT delete `director_user_id` / `director_email` columns until confirmed safe

### 5. Evaluate Static Reference Data (MEDIUM)
| File | Decision Needed |
|---|---|
| `data/songLibrary.ts` | Static config or DB-managed? |
| `data/curriculum.ts` | Static config or DB-managed? |
| `data/reference/enrollmentOptions.ts` | Likely DB-managed long term |
| `data/reference/classGroupOptions.ts` | Likely DB-managed long term |

---

## Class + Session Architecture

### Two Tables — Distinct Purposes
- **`rock_classes`** — the standing class template. Describes a recurring class: school, day/time, enrolled students, songs, show info. Think of it as the permanent class roster card.
- **`class_sessions`** — a specific dated occurrence of a class. Tracks date, start/end time, status, and director feedback. One `rock_class` → many `class_sessions`.

### Foreign Key
`class_sessions.class_id` → `rock_classes.id`

### Session Design Intent
Sessions are intentionally designed as **archivable instances**:
- Each session has its own date, instructor assignment, and notes
- Sessions can be closed/archived after they occur
- This structure supports future Pike 13 integration (see below)

### ⚠️ Legacy Fields in rock_classes
- `school` — legacy duplicate of `school_id`, flagged for cleanup
- `director_email` / `director_user_id` — legacy "director" role fields, should eventually be renamed to reflect "show director" assignment (any staff member)

---

## Pike 13 Integration (Future Phase)
Pike 13 is School of Rock's school management system — it handles scheduling, instructor assignments, and student enrollment at the school operations level.

**Vision:** Pike 13 will eventually write into or override `class_sessions` instances independently, including:
- Assigning substitute instructors per session
- Adding/removing students per session (without changing the master `rock_classes` roster)
- Pushing scheduled class dates automatically

**Architecture implication:** Never flatten session data back into `rock_classes`. Keep `class_sessions` as the authoritative instance-level record. All session-level data (instructor, students present, notes, feedback) must live in `class_sessions`, not in the parent `rock_classes` template.

**Do not build the Pike 13 integration now** — but every decision about class and session data structure should be made with this future integration in mind.

---
- Lesson progress lives in `students.curriculum` as jsonb
- Structure: `{ [lessonKey]: { done: bool, signed: bool, date: string, fistBumps: int } }`
- Workflow state lives in `students.workflow` as jsonb
- No separate progress table needed — this is intentional for current phase

---

## Terminology — Use These Terms Consistently

| Term | Meaning | Notes |
|---|---|---|
| **Class Instructor** | Staff member who leads a group class | DB column is `director_user_id` (legacy name — do not rename). All UI labels must say "Class Instructor" |
| **Music Director** | A real School of Rock staff role (DB value: `director`) | Keep this term exactly as-is wherever it appears |
| **Instructor** | Staff member teaching a student's private lesson | Stored as `primary_instructor_user_id` on students |

**Rules:**
- Never use the standalone word "Director" in any UI label, button, heading, or user-facing string
- It is always either "Class Instructor" or "Music Director" — never bare "Director"
- `director_user_id` and `director_email` are legacy DB column names — keep them, do not rename
- Variable names and code comments may use `director` — this rule is for UI strings only

---

## Working Style — NON-NEGOTIABLE
- **Move in small, safe, reversible steps — always**
- **Explain everything in beginner-friendly language** — the developer is a domain expert, not a seasoned coder
- **Show exact code with file path and line context**
- **Pause after each step** and wait for confirmation before proceeding
- **Never delete a live table or file** until its replacement is confirmed working
- **Prefer additive migrations** — add new → backfill → cut over → clean up
- **No big rewrites** — surgical changes only
- **Always verify Git is clean** before starting any structural refactor
- **Production data safety is the top priority**

---

## UI Design System — Stage Ready Visual Language
This design system must be followed for ALL new UI work including the Performance Program. Every component should feel like a natural extension of the School of Rock Method App.

### Layout Shell
- `components/AppShell.tsx` is the layout wrapper
- Left sidebar (200px) + main content area
- Sidebar: persistent on desktop (md+), hamburger drawer on mobile (<md)
- Sidebar background: #000000 (pure black)
- Main content background: #ffffff (white page)
- Content tiles: dark (#111111) on white — dark tiles pop against white background

### Sidebar Structure (top to bottom)
1. SOR logo image (/sor-logo.png) — centered, w-32
2. Role badge — white bg (#ffffff), black text, full width, normal weight font
3. Location block — gray label + school name, dropdown selector for owner role
4. Viewing block — gray label + student name + instrument/program tags (only when student selected)
5. STUDENT nav section
6. SCHOOL nav section
7. Sign Out at bottom

### Sidebar Nav Styling
- Section labels: #666666, 11px, normal weight, sentence case
- Nav items: white, 14px, font-weight 400
- Active item: bg-[#cc0000], white text, full width
- Hover: bg-[#1a1a1a]
- Zero border-radius on all nav elements

### Color Palette — Non-Negotiable
| Use | Value |
|---|---|
| Brand red | #cc0000 |
| Hover red | #b30000 |
| Primary tile background | #111111 |
| Secondary tile / inner card | #1a1a1a |
| Progress bar track | #333333 |
| Progress bar fill | #cc0000 |
| Page background | #ffffff |
| Muted/secondary text | text-zinc-500 |

NEVER use Tailwind red classes (bg-red-500, bg-red-600 etc.) — always use bg-[#cc0000].
NEVER use var(--sor-red) — CSS variable is wrong.
NEVER use sor-finish-card CSS class.

### Typography
- Display headings: Oswald (--font-oswald) — bold condensed, for section titles. Two-tone pattern: RED WORD + WHITE ITALIC WORD. Example: "MONTH 1" in #cc0000 + "FOUNDATIONS" in white italic
- Body/nav: Roboto (--font-roboto), normal weight

### Border Radius — Zero Everywhere
All interactive and content elements use `rounded-none`:
- Buttons, badges, tags, cards, tiles, inputs, progress bars, modal containers
- Exception: slider thumb keeps `border-radius: 50%`

### Button Styling
- Primary: `bg-[#cc0000] text-white rounded-none`
- Hover: `hover:bg-[#b30000]`
- Complete/signed state: `bg-zinc-700 text-white rounded-none` (neutral gray, never green)
- Never use `rounded-lg`, `rounded-full`, `rounded-xl` on any button

### Progress Bars
- Track: `bg-[#333333] rounded-none` height 4px
- Fill: `bg-[#cc0000] rounded-none`
- Range input sliders: use CSS pseudo-elements in globals.css — Tailwind classes don't reach native browser track rendering
- Red fill driven by `--value` CSS custom property set inline on the input element

### Page Structure — Every Student View
1. WorkflowBanner (red, full width, only when student selected + on student tab)
2. Back button (px-6 pt-4, inside white area)
3. Photo hero header (full width, dark overlay, white text — never round corners on photo hero)
4. Content (p-6 space-y-6 wrapper, white bg, dark tiles inside)

### Section Header Pattern
Large two-tone display heading:
- First word(s): color #cc0000 via inline style
- Remaining words: pure white, no opacity reduction
- Red underline accent below
- Background: solid `bg-[#111111] rounded-none`
- Never use gradients, glow, or backdrop-blur

### Tile/Card Pattern
- Outer section: `bg-[#111111] rounded-none`
- Inner cards: `bg-[#1a1a1a] rounded-none`
- Notes/feedback cards: `bg-[#1a1a1a] rounded-none` with `border-l-2 border-l-[#cc0000]` red left accent
- Never use box shadows, gradients, or blur

### What To Never Do
- Never use Tailwind red classes (`bg-red-*`)
- Never use `var(--sor-red)`
- Never use rounded corners on any element
- Never use gradients on content tiles
- Never use backdrop-blur or bg-opacity
- Never use `bg-zinc-900/82` style opacity classes
- Never use `sor-finish-card` CSS class
- Never add gamification elements (trophies etc.) to instructor-facing professional views

---

## Performance Program — Early Work Exists
There are folders in the codebase containing early Performance Program work (approximately 5% complete). Before doing any Performance Program build work, Claude Code must first audit these folders and produce an inventory of:
- What files exist and what they do
- What is functional vs scaffolding vs abandoned
- What conflicts or overlaps with the existing Supabase schema
- What is safe to build on vs safe to delete

Do not assume these files are correct or complete. Do not build on top of them without auditing first.

**Audit prompt to run at start of Performance Program phase:**
```
Audit all files related to the Performance Program in this codebase.
List every file, what it does, its current state (functional/scaffolding/incomplete),
and whether it conflicts with the Supabase schema. Do not make any changes.
Produce a clear inventory before we decide what to keep.
```

---

## RLS (Row Level Security) Policies
Some Supabase tables already have RLS policies in place. Before any migration or schema change, Claude Code must check whether the affected table has RLS policies that could break after the change.

**Before touching any table, run this SQL to check its policies:**
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = '[table_name]'
ORDER BY tablename, policyname;
```

**To see all RLS policies across the entire database:**
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Never disable or modify RLS policies without explicit confirmation. If a migration would affect a table with RLS, flag it before proceeding.

### Current RLS Policies (as of March 2026)

| Table | Policy | Type | Rule Summary |
|---|---|---|---|
| `rock_classes` | Classes can be read by school | SELECT | `school_id` must match `staff.school_slug` for logged-in user |
| `schools` | Allow read access to schools | SELECT | Public read — anyone can read |
| `staff` | Allow insert for staff | INSERT | Open insert |
| `staff` | Staff can only see their school | SELECT | Currently set to `true` — effectively open read |
| `staff` | Staff can update their school | UPDATE | `school_slug` must match logged-in user's school |
| `students` | Students can only see their school | SELECT | `school` must match staff's `school_slug` |
| `students` | Students can update their school | UPDATE | `school` must match staff's `school_slug` |
| `users` | Users can read their own record | SELECT | `auth.uid()` must match `auth_id` |

### ⚠️ RLS Warnings — Review Before Migrating

**1. `rock_classes` uses `school_id` — localStorage migration risk**
The RLS policy filters `rock_classes` by `school_id`. If `saveClasses()` in `lib/classes.ts` is not correctly setting `school_id` on every write, records written to Supabase may become invisible to the logged-in user due to RLS filtering. Verify `school_id` is always populated before migrating classes off localStorage.

**2. `staff` SELECT policy is effectively open (`true`)**
The "Staff can only see their school" SELECT policy has `qual = true`, meaning it allows all reads. This may be intentional for now but should be tightened before going to production at scale.

**3. `students` and `rock_classes` both rely on `staff.school_slug`**
Both policies look up the logged-in user's school via `staff.school_slug`. If a staff member exists in `users` or `profiles` but not in `staff`, these queries will return no results. During the session/auth migration (Phase 1, Step 1.3), ensure every authenticated user has a corresponding `staff` record or these policies will silently break data visibility.

**4. No RLS on most tables**
The following tables have no RLS policies yet: `programs`, `program_enrollments`, `class_sessions`, `parents`, `parent_student_links`, `show_group_instances`, `cast_slot_types`, and all other tables. This is acceptable for pilot but must be addressed before multi-school production rollout.

---

## Break/Fix Recovery Protocol
If a refactor breaks something, follow this exact sequence. Do not skip steps.

### Step 1 — Stop Immediately
Do not try to fix forward by writing more code. Stop and assess.

### Step 2 — Identify the Blast Radius
Run this in Claude Code:
```
Something broke after the last change. Before trying to fix it,
tell me exactly what changed, what is now broken, and what files
were touched. Do not write any new code yet.
```

### Step 3 — Check Git First
```bash
git status          # see what changed
git diff            # see exact line changes
git log --oneline   # find the last clean commit
```

### Step 4 — Decide: Fix Forward or Roll Back
- If the break is small and cause is clear → fix forward with Claude Code
- If the break is large or cause is unclear → roll back to last clean commit:
```bash
git stash           # save any work in progress
git checkout [last-clean-commit-hash]
```

### Step 5 — If Rolling Back
After rolling back, tell Claude Code:
```
We rolled back to [commit]. Here is what broke and why.
Before we try again, explain what we should do differently
to avoid the same problem. Do not write code yet.
```

### Step 6 — Prevention Going Forward
After any recovery, Claude Code should:
- Explain what caused the break in plain English
- Propose a safer approach before writing any new code
- Confirm a Git commit exists before starting the retry

### Common Break Scenarios
| Scenario | First Action |
|---|---|
| Page/component crashes | Check browser console for exact error, share with Claude Code |
| Supabase query returns nothing | Check RLS policies on that table first |
| Login broken | Check `lib/session.ts` and `staff`/`users` table queries |
| Progress not saving | Check `students.curriculum` write path in Supabase |
| Build fails on Vercel | Check for TypeScript errors locally first with `npm run build` |

---

## What Must Not Break
- Parent login flow
- Staff login + school context selection
- Class session creation and assignment
- Student curriculum progress tracking (Rock 101)
- Show/performance workflow
- Parent update log and communications
- Program enrollment
