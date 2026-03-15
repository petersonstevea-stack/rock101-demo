export type ActivityItem = {
  id: string;
  type:
    | "privateLesson"
    | "groupRehearsal"
    | "badge"
    | "certificate"
    | "milestone";
  title: string;
  description?: string;
  dateLabel: string;
};

export type DashboardStat = {
  label: string;
  value: string;
  sublabel?: string;
};

export type ProgressBlock = {
  label: string;
  completed: number;
  total: number;
  percent: number;
};

export type WhatsNextItem = {
  id: string;
  label: string;
  area: "privateLesson" | "groupRehearsal" | "certificate" | "general";
  description?: string;
  priority: "high" | "medium" | "low";
};

export type ParentDashboardData = {
  student: {
    id: string;
    name: string;
    instrument: string;
    className: string;
    schoolName: string;
    nextPerformanceDate?: string | null;
  };
  overallProgressPercent: number;
  stats: {
    privateLessons: DashboardStat;
    groupRehearsal: DashboardStat;
    badgesEarned: DashboardStat;
    fistBumps: DashboardStat;
  };
  progress: {
    privateLessons: ProgressBlock;
    groupRehearsal: ProgressBlock;
  };
  rehearsalReady: {
    ready: boolean;
    label: string;
    description: string;
  };
  certificate: {
    earned: boolean;
    completedRequired: number;
    totalRequired: number;
    label: string;
    description: string;
  };
  badgeSummary: {
    earned: number;
    available: number;
    nextBadgeLabel?: string;
  };
  recentActivity: ActivityItem[];
  whatsNext: WhatsNextItem[];
};