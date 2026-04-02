# ARCHITECTURE.md — Stage Ready Full Vision
## Read for context. Do not build ahead of ROADMAP.md.

---

## What This Document Is
This is the full long-term product architecture for Stage Ready. Claude Code should read this to understand where the system is going, so no current decision accidentally blocks the future. Do not build features from this document unless ROADMAP.md says so.

---

## Programs — Five Delivery Models

### 1. Rock 101 — Milestone / Checklist / Sign-off Program
- Instrument-specific curriculum
- Explicit lesson items with sign-off workflow
- Graduation requirements
- Parent-facing progress visibility
- **Status: Active pilot**

### 2. Performance Program — Long-term Show-based Band Program
- Multi-season participation
- Show groups per school per season
- Song setlists with song-by-song casting
- Students may be in multiple show groups simultaneously
- Show Director = any staff member assigned to lead a show group (not a role)
- **Status: Next build**

### 3. Little Wing — Open-enrollment Rotating Developmental Program
- 8-week rotating cycle, students may join at any time
- Multiple activity options per weekly focus
- Developmental domain tracking (Social/Emotional, Motor, Cognitive, Musical, Classroom Readiness)
- Readiness toward Rookies
- **Status: Future phase**

### 4. Rookies — Open-enrollment Rotating Structured Program
- More structured than Little Wing
- Structured time-block session format (intro, Song of Day, jam, project song, outro)
- Genre and song rotation
- Readiness toward Rock 101
- **Status: Future phase**

### 5. Summer Camps — Stand-alone Short-term Programs
- Fixed date ranges, themed offerings
- Optional performances
- May overlap with active core program enrollments
- Conversion pathway into core programs
- **Status: Future phase**

---

## Shell Architecture — Instructor vs Student/Parent

### Instructor Shell
One unified shell for all instructors regardless of program.
My Schedule and My Lessons show Rock 101 AND Performance Program
content in the same view. Program type communicated through
card color only:
- Rock 101: red accent #cc0000
- Performance Program: dark #1a1a1a with white border

### Student/Parent Shell
Dynamic nav based on the selected student's active program
enrollments. Never a static nav array. Each program adds its
own tab set:
- Rock 101: Dashboard, Private Lesson, Grad Requirements,
  Group Rehearsal, Certificate
- Performance Program: tabs TBD Phase 2

### Program Color System
Consistent across all views — Exceptions dashboard, parent
email, instructor schedule, student shell:
| Program | Accent | Card Style |
|---|---|---|
| Rock 101 | #cc0000 | red border/accent |
| Performance Program | white | dark tile, white border |

---

## Recommended Student Pathway
```
Little Wing → Rookies → Rock 101 → Performance Program
```
This is recommended, not enforced. Students may join at any point, skip stages, stay longer, or dual-enroll in camps alongside core programs.

---

## Organizational Structure

### School-Level Hierarchy
```
Owner (= Franchise Owner)
└── General Manager
    └── Music Director
        └── Instructor
            └── Parent (family login)
                └── Student (no login currently — future phase)
```

### Platform-Level — Franchise Model
```
Franchisor / Parent Company Admin
└── International Franchise Rollup
    └── Regional Franchise Leader
        └── Franchise Group / Owner
            └── School(s)
```

### Platform-Level — Corporate Model
```
Corporate System Leader
└── Regional Manager
    └── District Manager
        └── Territory Manager
            └── School(s)
```

---

## Permission Model
Every permission check requires **role + scope**, not role alone.

| Scope | Description |
|---|---|
| `global` | Franchisor/system-wide |
| `franchise_rollup` | International rollup view |
| `franchise_region` | Regional franchise view |
| `franchise_group` | Franchise owner's schools |
| `corporate_region` | Corporate regional view |
| `corporate_district` | District manager view |
| `corporate_territory` | Territory manager view |
| `school` | Single school |
| `family` | Parent/student household |

---

## School Hierarchy Fields (Target State)
```sql
-- Common fields
id, name, slug, school_type, country, active, created_at

-- Franchise hierarchy
franchise_rollup_slug
franchise_region_slug
franchise_group_slug

-- Corporate hierarchy
corporate_region_slug
corporate_district_slug
corporate_territory_slug
```
Current pilot uses simplified school fields. Add hierarchy fields post-pilot. Normalize into separate hierarchy tables only if scale demands it.

---

## Full Target Schema — Key Table Groups

### Org + School Layer
`organizations`, `schools`, `programs`, `program_progression_paths`

### User + Auth Layer
`staff`, `users`, `profiles`, `roles`, `staff_school_roles`, `user_school_roles`, `user_scope_assignments`, `user_program_permissions`, `user_invites`

### Staff Profile Fields (on `staff` table)
All staff-facing profile fields use the `profile_` prefix:
- `profile_bio`, `profile_teaching_philosophy` — free text, editable by the staff member
- `profile_instruments` — string array
- `profile_favorite_song_to_teach`, `profile_favorite_artist`, `profile_first_concert`, `profile_currently_obsessed_with`, `profile_fun_fact` — personal cards
- `profile_photo_url`, `profile_wallpaper_url`, `profile_wallpaper_preset` — media fields; photo upload via Supabase Storage is a future phase (currently URL input only)
- `profile_visible`, `profile_show_photo`, `profile_show_personal`, `profile_show_wallpaper` — management-controlled visibility booleans (owner/GM only)
- Wallpaper uses a preset system: a `profile_wallpaper_preset` value (e.g. "band", "stage") maps to a URL; custom upload is future phase

### Student + Family Layer
`students`, `parents`, `parent_student_links`, `program_enrollments`

### Class + Session Layer
`rock_classes` (rename to `class_sections` long-term), `class_sessions`, `session_staff_assignments`

### Curriculum Layer — Rock 101
`method_lessons`, curriculum structure tables (TBD)

### Curriculum Layer — Little Wing + Rookies (Future)
`program_cycles`, `program_weeks`, `activities`, `development_domains`, `skill_tags`, `learning_objectives`, `activity_skill_tags`, `activity_learning_objectives`, `program_week_activity_options`, `session_activity_instances`, `session_block_templates`

### Student Development Layer (Future)
`student_observations`, `program_readiness_indicators`, `student_readiness_status`, `student_instrument_exposure`

### Song + Genre Layer
`songs`, `genres`, `program_week_song_options`

### Performance Program — Show Layer
`seasons`, `show_theme_types`, `show_themes`, `show_group_instances`, `show_group_student_memberships`, `show_group_songs`

### Performance Program — Casting Layer
`cast_slot_types`, `show_song_cast_slots`, `show_song_cast_assignments`

### Reporting + Communications Layer
`parent_update_log`, `parent_student_links`, `waiver_templates`, `user_waiver_acceptances`

---

## Performance Program — Critical Rules

### Show Director
- Show Director is a **function**, not a role
- Any staff member may be designated Show Director for a specific show group
- Stored as `show_director_user_id` on `show_group_instances`

### Show Group Membership
- A student may belong to **multiple show groups simultaneously**
- Do not enforce one student = one show group

### Casting Rules
- Casting is **song-by-song**, not show-level
- Each song has defined cast slots (drums, bass, guitar 1/2/3, keys, lead vocals, backing vocals, auxiliary)
- Backing vocals must support **more than two students**
- Understudies must be stored **relationally** — never in notes fields
- Auxiliary slots use `custom_label` for unusual instruments (trumpet, sitar, violin, etc.)
- Do not hardcode every possible instrument — use auxiliary + custom label

### Show Builder Workflow
1. Select Season + Year (both required — never derive from dates alone)
2. Select Show Theme Type (Heavy Rotation / Steady Rotation / Custom)
3. Theme dropdown filters by selected type
4. Add venue (free text for now)
5. Build setlist
6. Cast song by song

---

## Reporting Requirements (Future)
- **System-wide:** all schools, all programs, show themes, seasonal trends
- **Multi-school:** franchise owner / district manager view of their schools
- **School-level:** active classes, show groups, student participation, casting coverage
- **Show-level:** songs, cast slots filled/unfilled, understudies, venue, performance date
- **Student-level:** programs, show groups, songs cast on, roles, primary/alternate/understudy status

---

## Parent Dashboard Direction (Future)
- Read-only family-facing view
- Rock 101 milestone visibility first
- Broader program visibility later
- Keep database compatible with future parent-facing expansion

---

## Non-Negotiable Architecture Rules
- Use relational structure for anything operationally important
- Do not hide critical logic in notes or free text fields
- Do not use JSON blobs as long-term system of record for structured data
- Build for reporting from day one
- Build for multi-school and system-wide scale
- Do not flatten all programs into one progress model
- Do not assume franchise and corporate schools use identical role naming
- Do not assume Performance Program is just class membership
