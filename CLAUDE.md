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
└── General Manager
    └── Music Director
        └── Instructor
            └── Parent (login, no management)
                └── Student (no login — future phase may add student login)
```

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

## Student Progress Architecture
- Lesson progress lives in `students.curriculum` as jsonb
- Structure: `{ [lessonKey]: { done: bool, signed: bool, date: string, fistBumps: int } }`
- Workflow state lives in `students.workflow` as jsonb
- No separate progress table needed — this is intentional for current phase

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

## What Must Not Break
- Parent login flow
- Staff login + school context selection
- Class session creation and assignment
- Student curriculum progress tracking (Rock 101)
- Show/performance workflow
- Parent update log and communications
- Program enrollment
