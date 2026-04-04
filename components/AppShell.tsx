"use client";

import { useState, type ReactNode } from "react";
import { Music, Music2, Sliders, Users } from "lucide-react";

function getRoleLabel(role: string): string {
  switch (role) {
    case "owner": return "Owner";
    case "general_manager": return "General Manager";
    case "music_director": return "Music Director";
    case "instructor": return "Instructor";
    case "parent": return "Parent";
    default: return role;
  }
}

type NavItem = {
  tab: string;
  label: string;
  icon?: ReactNode;
};

const ROCK101_STUDENT_NAV: NavItem[] = [
  { tab: "parent", label: "Dashboard" },
  { tab: "privateLesson", label: "Private Lesson" },
  { tab: "graduationRequirements", label: "Grad Requirements" },
  { tab: "groupRehearsal", label: "Group Rehearsal" },
  { tab: "certificate", label: "Certificate" },
];

// Visible to all staff (owner, general_manager, music_director, instructor)
const SCHOOL_NAV_BASE: NavItem[] = [
  { tab: "mySchedule", label: "My Schedule" },
  { tab: "classes", label: "Classes" },
  { tab: "schedule", label: "Schedule" },
  { tab: "myProfile", label: "My Profile" },
];

// Visible to management only (owner, general_manager, music_director)
const SCHOOL_NAV_MANAGEMENT: NavItem[] = [
  { tab: "classSetup", label: "Class Setup" },
  { tab: "lessonSetup", label: "Lesson Setup" },
  { tab: "manageLessons", label: "Manage Lessons" },
  { tab: "bandsDashboard", label: "Bands" },
  { tab: "pipeline", label: "Pipeline" },
  { tab: "executionDashboard", label: "Exceptions" },
  { tab: "admin", label: "Admin" },
];

type AppShellProps = {
  children: React.ReactNode;
  schoolName: string;
  studentName?: string;
  instrument?: string;
  programName?: string;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  canSeeStudentTabs: boolean;
  canSeeManagementTabs: boolean;
  role: string;
  userName?: string;
  isOwner?: boolean;
  schoolList?: { id: string; name: string }[];
  onSchoolChange?: (schoolId: string) => void;
  selectedSchoolId?: string;
  studentNavItems?: NavItem[];
  exceptionsCount?: number;
  canSeeClassRoster?: boolean;
  canSeeShowGroups?: boolean;
  canSeeCasting?: boolean;
  canSeePerformanceRehearsal?: boolean;
};

function NavButton({
  item,
  currentTab,
  onTabChange,
  badge,
}: {
  item: NavItem;
  currentTab: string;
  onTabChange: (tab: string) => void;
  badge?: number;
}) {
  const isActive = currentTab === item.tab;
  return (
    <button
      key={item.tab}
      type="button"
      onClick={() => onTabChange(item.tab)}
      className="w-full px-4 py-2.5 text-left transition-colors flex items-center"
      style={{
        backgroundColor: isActive ? "#cc0000" : "transparent",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 400,
        borderRadius: 0,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "#1a1a1a";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span className="flex-1 flex items-center gap-2">
        {item.icon && <span className="shrink-0">{item.icon}</span>}
        {item.label}
      </span>
      {badge != null && badge > 0 && (
        <span className="ml-auto bg-[#cc0000] text-white rounded-none px-1.5 py-0.5 text-[10px] min-w-[18px] text-center font-bold"
          style={isActive ? { backgroundColor: "rgba(255,255,255,0.25)" } : undefined}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function NavItems({
  currentTab,
  onTabChange,
  canSeeStudentTabs,
  canSeeManagementTabs,
  role,
  studentNavItems,
  exceptionsCount,
  canSeeClassRoster,
  canSeeShowGroups,
  canSeeCasting,
  canSeePerformanceRehearsal,
}: {
  currentTab: string;
  onTabChange: (tab: string) => void;
  canSeeStudentTabs: boolean;
  canSeeManagementTabs: boolean;
  role: string;
  studentNavItems?: NavItem[];
  exceptionsCount?: number;
  canSeeClassRoster?: boolean;
  canSeeShowGroups?: boolean;
  canSeeCasting?: boolean;
  canSeePerformanceRehearsal?: boolean;
}) {
  const isStaff =
    role === "owner" ||
    role === "general_manager" ||
    role === "music_director" ||
    role === "instructor";

  const resolvedStudentNav = studentNavItems ?? ROCK101_STUDENT_NAV;

  const classRosterNavItem: NavItem = {
    tab: "classRoster",
    label: "Class Roster",
    icon: <Users size={14} />,
  };

  const showGroupsNavItem: NavItem = {
    tab: "showGroups",
    label: "Show Groups",
    icon: <Music size={14} />,
  };

  const castingNavItem: NavItem = {
    tab: "casting",
    label: "Casting",
    icon: <Sliders size={14} />,
  };

  const performanceRehearsalNavItem: NavItem = {
    tab: "performanceRehearsal",
    label: "Rehearsal",
    icon: <Music2 size={14} />,
  };

  const schoolNavItems: NavItem[] = [
    ...(isStaff ? SCHOOL_NAV_BASE : []),
    ...(canSeeShowGroups ? [showGroupsNavItem] : []),
    ...(canSeePerformanceRehearsal ? [performanceRehearsalNavItem] : []),
    ...(canSeeManagementTabs ? SCHOOL_NAV_MANAGEMENT : []),
  ];

  return (
    <>
      {canSeeStudentTabs && (
        <div>
          <div className="px-4 pt-4 pb-1" style={{ color: "#666666", fontSize: "11px", fontWeight: 400 }}>
            Student
          </div>
          {resolvedStudentNav.map((item) => (
            <NavButton key={item.tab} item={item} currentTab={currentTab} onTabChange={onTabChange} />
          ))}
        </div>
      )}

      {schoolNavItems.length > 0 && (
        <div>
          <div className="px-4 pt-4 pb-1" style={{ color: "#666666", fontSize: "11px", fontWeight: 400 }}>
            School
          </div>
          {schoolNavItems.map((item) => (
            <NavButton
              key={item.tab}
              item={item}
              currentTab={currentTab}
              onTabChange={onTabChange}
              badge={item.tab === "executionDashboard" ? exceptionsCount : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SidebarContent({
  schoolName,
  studentName,
  instrument,
  programName,
  currentTab,
  onTabChange,
  onSignOut,
  canSeeStudentTabs,
  canSeeManagementTabs,
  role,
  isOwner,
  schoolList,
  onSchoolChange,
  studentNavItems,
  exceptionsCount,
  userName,
  canSeeClassRoster,
  canSeeShowGroups,
  canSeeCasting,
  canSeePerformanceRehearsal,
  selectedSchoolId,
}: Omit<AppShellProps, "children">) {
  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "#000000" }}>
      {/* Logo */}
      <img src="/sor-logo.png" alt="School of Rock" className="w-32 mx-auto block py-4 px-2 object-contain" />

      {/* Role badge */}
      <div className="border-b border-zinc-300 bg-white px-4 py-2">
        <div className="text-black" style={{ fontSize: "14px", fontWeight: 400 }}>{getRoleLabel(role)}</div>
        {userName && (
          <div className="text-zinc-500" style={{ fontSize: "12px" }}>
            {userName}
          </div>
        )}
      </div>

      {/* School */}
      <div className="border-b border-zinc-800 px-4 py-4">
        <div style={{ color: "#666666", fontSize: "10px" }}>
          Location
        </div>
        {isOwner && schoolList && schoolList.length > 0 && onSchoolChange ? (
          <select
            className="mt-1 w-full bg-transparent leading-snug text-white outline-none"
            style={{ fontSize: "13px", fontWeight: 500 }}
            value={selectedSchoolId ?? "all"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "all") { onSchoolChange("all"); return; }
              const selected = schoolList.find((s) => s.id === val);
              if (selected) onSchoolChange(selected.id);
            }}
          >
            <option value="all" style={{ backgroundColor: "#000000" }}>All Schools</option>
            {schoolList.map((s) => (
              <option key={s.id} value={s.id} style={{ backgroundColor: "#000000" }}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="mt-1 leading-snug text-white" style={{ fontSize: "13px", fontWeight: 500 }}>
            {schoolName}
          </div>
        )}
      </div>

      {/* Student context */}
      {studentName && (
        <div className="border-b border-zinc-800 px-4 py-4">
          <div style={{ color: "#666666", fontSize: "10px" }}>
            Viewing
          </div>
          <div className="mt-1 leading-snug text-white" style={{ fontSize: "13px", fontWeight: 500 }}>
            {studentName}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {instrument && (
              <span className="bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                {instrument}
              </span>
            )}
            {programName && (
              <span className="bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
                {programName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <NavItems
          currentTab={currentTab}
          onTabChange={onTabChange}
          canSeeStudentTabs={canSeeStudentTabs}
          canSeeManagementTabs={canSeeManagementTabs}
          role={role}
          studentNavItems={studentNavItems}
          exceptionsCount={exceptionsCount}
          canSeeClassRoster={canSeeClassRoster}
          canSeeShowGroups={canSeeShowGroups}
          canSeeCasting={canSeeCasting}
          canSeePerformanceRehearsal={canSeePerformanceRehearsal}
        />
      </nav>

      {/* Sign out */}
      <div className="border-t border-zinc-800 px-4 pb-16 pt-4 md:pb-4">
        <button
          type="button"
          onClick={onSignOut}
          className="text-xs text-white transition-colors hover:text-zinc-300"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children, ...props }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleTabChange(tab: string) {
    props.onTabChange(tab);
    setDrawerOpen(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className="hidden md:flex w-[200px] shrink-0 flex-col"
        style={{ backgroundColor: "#000000" }}
      >
        <SidebarContent {...props} />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 bg-black">
        {/* Mobile header — visible on mobile only */}
        <div
          className="flex md:hidden items-center px-4 py-3 border-b border-zinc-800"
          style={{ backgroundColor: "#000000" }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="text-white p-1"
            aria-label="Open menu"
          >
            {/* Hamburger icon */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="5" width="18" height="2" fill="currentColor" />
              <rect x="2" y="10" width="18" height="2" fill="currentColor" />
              <rect x="2" y="15" width="18" height="2" fill="currentColor" />
            </svg>
          </button>

          <div className="flex-1 text-center text-sm font-bold uppercase tracking-[0.18em] text-white">
            Stage Ready
          </div>

          {/* Spacer to balance the hamburger */}
          <div className="w-[30px]" />
        </div>

        {children}
      </main>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dark overlay */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 h-full w-[200px] flex flex-col"
            style={{ backgroundColor: "#000000" }}
          >
            {/* Close button */}
            <div className="flex justify-end px-4 py-3 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2" />
                  <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <SidebarContent {...props} onTabChange={handleTabChange} />
          </div>
        </div>
      )}
    </div>
  );
}
