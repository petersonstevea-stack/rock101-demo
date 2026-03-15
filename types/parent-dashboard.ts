export type ActivityItem = {
  id: string;
  type: "privateLesson" | "groupRehearsal" | "badge";
  title: string;
  description: string;
  dateLabel: string;
};

export type WhatsNextItem = {
  id: string;
  label: string;
  description?: string;
  area: "privateLesson" | "groupRehearsal";
  priority: "high" | "medium" | "low";
};

export type DashboardStat = {
  label: string;
  value: string;
  sublabel?: string;
};

export type ProgressCard = {
  label: string;
  completed: number;
  total: number;
  percent: number;
  targetTab: "privateLesson" | "groupRehearsal" | "certificate";
};

export type ParentDashboardData = {
  student: {
    id: string;
    name: string;
    instrument: string;
    className: string;
    schoolName: string;
    nextPerformanceDate: string | null;
  };
  overallProgressPercent: number;
  stats: {
    privateLessons: DashboardStat;
    groupRehearsal: DashboardStat;
    badgesEarned: DashboardStat;
    fistBumps: DashboardStat;
  };
  progress: {
    graduationRequirements: ProgressCard;
    methodAppLessons: ProgressCard;
    rehearsalReadiness: ProgressCard;
    certificate: ProgressCard;
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
    percent: number;
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
  notesMeta: {
    lessonLastUpdated: string | null;
    rehearsalLastUpdated: string | null;
  };
  summary: {
    title: string;
    text: string;
  };
};